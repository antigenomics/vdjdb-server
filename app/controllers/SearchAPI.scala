package controllers


import play.api.libs.iteratee.{Concurrent, Enumerator, Iteratee}
import play.api.libs.json._
import play.api.mvc._
import play.api.libs.json.Json.toJson
import server.database.GlobalDatabase
import server.search.SearchResults
import server.wrappers.Filters
import utils.converter.DocumentConverter
import scala.concurrent.ExecutionContext.Implicits.global
import server.websocket.WebSocketSearchMessages._



/**
  * Created by bvdmitri on 16.02.16.
  */

object SearchAPI extends Controller {

  def index = Action { implicit request =>
    Ok(views.html.search.index())
  }

  def columns = LimitedAction { implicit request =>
    Ok(toJson(GlobalDatabase.getColumns()))
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
      BadRequest("Invalid request")
    }
  }

  case class DatabaseTextFilter(columnId: String, value: String, filterType: String, negative: Boolean)
  implicit val databaseTextFilterRead = Json.reads[DatabaseTextFilter]

  case class DatabaseSequenceFilter(columnId: String, query: String, mismatches: Int, insertions: Int, deletions: Int, mutations: Int)
  implicit val databaseSequenceFilterRead = Json.reads[DatabaseSequenceFilter]

  case class FiltersRequest(textFilters: List[DatabaseTextFilter], sequenceFilters: List[DatabaseSequenceFilter])
  implicit val filtersRequestRead = Json.reads[FiltersRequest]

  case class SearchWebSocketRequest(action: String, data: JsValue)
  implicit val searchWebSocketRequestReader = Json.reads[SearchWebSocketRequest]

  def searchWebSocket = WebSocket.using[JsValue] { request =>
    val (out,channel) = Concurrent.broadcast[JsValue]
    val searchResults : SearchResults = new SearchResults()
    var filters : Filters = null

    val in = Iteratee.foreach[JsValue] {
      websocketMessage  =>
        if (!LimitedAction.allow(request.remoteAddress)) {
          channel push Json.toJson(Map(
            "status" -> "error",
            "message" -> "Too many requests"
          ))
        } else try {
          val searchRequest = Json.fromJson[SearchWebSocketRequest](websocketMessage).get
          val requestData = searchRequest.data
          searchRequest.action match {
            case "columns" =>
              channel push Json.toJson(Map(
                "status" -> toJson("success"),
                "action" -> toJson("columns"),
                "columns" -> toJson(GlobalDatabase.getColumns())
              ))
            case "search"  =>
              val filtersRequest = Json.fromJson[FiltersRequest](requestData).get
              filters = Filters.parse(filtersRequest.textFilters, filtersRequest.sequenceFilters)
              searchResults.reinit(filters)
              channel push SearchSuccessMessage(searchResults.getPage(0), searchResults.results.size)
              if (filters.warnings.nonEmpty) {
                channel push WarningsMessage(filters.warnings)
              }
            case "get_page" =>
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              channel push GetPageSuccessMessage(searchResults.getPage(page), page)
            case "sort" =>
              val columnId = (requestData \ "columnId").asOpt[Int].getOrElse(1)
              val sortType = (requestData \ "sortType").asOpt[String].getOrElse("asc")
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              searchResults.sort(columnId, sortType)
              channel push SortSuccessMessage(searchResults.getPage(page))
            case "change_size" =>
              val size = (requestData \ "size").asOpt[Int].getOrElse(100)
              val init = (requestData \ "init").asOpt[Boolean].getOrElse(true)
              searchResults.pageSize = size
              channel push ChangeSizeSuccessMessage(init, if (init) null else searchResults.getPage(0), size)
            case "complex" =>
              val complexId = (requestData \ "complexId").asOpt[String].getOrElse("-1")
              val gene = (requestData \ "gene").asOpt[String].getOrElse("null")
              val index = (requestData \ "index").asOpt[Int].getOrElse(-1)
              if (gene.equals("TRA") || gene.equals("TRB")) {
                val complex = GlobalDatabase.findComplex(complexId, gene)
                channel push FindComplexSuccessMessage(complex.get, complexId, gene, index)
              } else {
                channel push FindComplexErrorMessage()
              }
            case "export" =>
              val exportType = (requestData \ "exportType").asOpt[String].getOrElse("excel")
              val converter = DocumentConverter.get(exportType)
              converter match {
                case Some(c) =>
                  val link = c.convert(searchResults.results)
                  link match {
                    case Some(l) =>
                      channel push ConverterSuccessMessage(exportType, l)
                    case _ =>
                      channel push ConverterExportFailed()
                  }
                case None =>
                  channel push ConverterInvalidTypeMessage()
              }
            case _ =>
          }
        } catch {
          case e : Exception =>
            e.printStackTrace()
            channel push InvalidSearchRequest()
        }
    }


    (in,out)
  }

}
