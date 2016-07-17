package controllers


import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import play.api.libs.iteratee.{Concurrent, Enumerator, Iteratee}
import play.api.libs.json._
import play.api.mvc._
import play.api.libs.json.Json.toJson
import server.database.GlobalDatabase
import server.results.SearchResults
import server.wrappers.{Filters, ServerResponse}
import utils.converter.DocumentConverter

import scala.concurrent.ExecutionContext.Implicits.global
import server.websocket._
import server.websocket.search._
import server.websocket.search.WebSocketSearchMessages._
import scala.collection.JavaConversions._


/**
  * Created by bvdmitri on 16.02.16.
  */

object SearchAPI extends Controller {

  def index = Action { implicit request =>
    Ok(views.html.search.index())
  }

  def columns = LimitedAction { implicit request =>
    Ok(toJson(GlobalDatabase.getColumns))
  }

  def presets = LimitedAction { implicit request =>
    Ok(toJson(SequenceSearcherPreset.getALLOWED_PRESETS.toList))
  }

  def downloadDocument(exportType: String, link: String) = LimitedAction { implicit request =>
    val folder = new java.io.File("/tmp/" + link + "/")
    val extension = DocumentConverter.getExtension(exportType)
    val doc = new java.io.File(folder.getAbsolutePath + "/" + "SearchResults" + extension)
    if (folder.exists() && doc.exists()) {
      val docContent: Enumerator[Array[Byte]] = Enumerator.fromFile(doc)
      doc.delete()
      folder.delete()
      SimpleResult(
        header = ResponseHeader(200, Map(
          CONTENT_DISPOSITION -> ("attachment; filename=SearchResults" + extension),
          CONTENT_TYPE -> "application/x-download"
        )),
        body = docContent
      )
    } else {
      BadRequest(toJson(ServerResponse("Invalid request")))
    }
  }

  case class DatabaseTextFilter(columnId: String, value: String, filterType: String, negative: Boolean)
  implicit val databaseTextFilterRead = Json.reads[DatabaseTextFilter]

  case class DatabaseSequenceFilter(columnId: String, query: String,
                                    presetName: String,
                                    mismatches: Int, insertions: Int, deletions: Int, mutations: Int,
                                    precision: Float, recall: Float)

  implicit val databaseSequenceFilterRead = Json.reads[DatabaseSequenceFilter]

  case class FiltersRequest(textFilters: List[DatabaseTextFilter], sequenceFilters: List[DatabaseSequenceFilter])
  implicit val filtersRequestRead = Json.reads[FiltersRequest]

  case class SearchWebSocketRequest(action: String, data: JsValue)
  implicit val searchWebSocketRequestReader = Json.reads[SearchWebSocketRequest]

  def search = LimitedAction(parse.json) { implicit request =>
    request.body.validate[FiltersRequest].map {
      case filtersRequest =>
        val filters = Filters.parse(filtersRequest)
        Ok(toJson(GlobalDatabase.search(filters)))
    }.recoverTotal {
      e =>
        BadRequest(toJson(ServerResponse("Invalid request")))
    }
  }

  def searchWebSocket = WebSocket.using[JsValue] { request =>
    val (out,channel) = Concurrent.broadcast[JsValue]
    val searchResults : SearchResults = new SearchResults()

    val in = Iteratee.foreach[JsValue] {
      websocketMessage  =>
        if (!LimitedAction.allow(request.remoteAddress)) {
          channel push LimitedAction.LimitErrorMessage
        } else try {
          val searchRequest = Json.fromJson[SearchWebSocketRequest](websocketMessage).get
          val requestData = searchRequest.data
          searchRequest.action match {
            case "search"  =>
              val filtersRequest = Json.fromJson[FiltersRequest](requestData).get
              val filters = Filters.parse(filtersRequest)
              searchResults.reinit(filters)
              channel push toJson(SearchSuccessMessage(searchResults.getPage(0), searchResults.results.size))
              if (filters.warnings.nonEmpty) {
                channel push toJson(WarningListMessage(filters.warnings))
              }
            case "get_page" =>
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              channel push toJson(GetPageSuccessMessage(searchResults.getPage(page), page))
            case "sort" =>
              val columnId = (requestData \ "columnId").asOpt[Int].getOrElse(1)
              val sortType = (requestData \ "sortType").asOpt[String].getOrElse("asc")
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              searchResults.sort(columnId, sortType)
              channel push toJson(SortSuccessMessage(searchResults.getPage(page)))
            case "change_size" =>
              val size = (requestData \ "size").asOpt[Int].getOrElse(100)
              val init = (requestData \ "init").asOpt[Boolean].getOrElse(true)
              searchResults.pageSize = size
              channel push toJson(ChangeSizeSuccessMessage(init, if (init) List() else searchResults.getPage(0), size))
            case "complex" =>
              val complexId = (requestData \ "complexId").asOpt[String].getOrElse("-1")
              val gene = (requestData \ "gene").asOpt[String].getOrElse("null")
              val index = (requestData \ "index").asOpt[Int].getOrElse(-1)
              if (gene.equals("TRA") || gene.equals("TRB")) {
                val complex = GlobalDatabase.findComplex(complexId, gene)
                channel push toJson(FindComplexSuccessMessage(complex.get, complexId, gene, index))
              } else {
                channel push toJson(ErrorMessage("Complex not found"))
              }
            case "export" =>
              val exportType = (requestData \ "exportType").asOpt[String].getOrElse("excel")
              val converter = DocumentConverter.get(exportType)
              converter match {
                case Some(c) =>
                  val link = c.convert(searchResults.results)
                  link match {
                    case Some(l) =>
                      channel push toJson(ConverterSuccessMessage(exportType, l))
                    case _ =>
                      channel push toJson(ErrorMessage("Export failed"))
                  }
                case None =>
                  channel push toJson(ErrorMessage("Export invalid type"))
              }
            case _ =>
          }
        } catch {
          case e : Exception =>
            channel push toJson(ErrorMessage("Invalid request"))
        }
    }


    (in,out)
  }

}
