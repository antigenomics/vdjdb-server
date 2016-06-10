package controllers


import java.util

import play.api.libs.iteratee.{Concurrent, Iteratee}
import play.api.libs.json._
import play.api.mvc._
import server.wrappers.{ColumnsInfo, SearchResult}
import server.{FiltersParser, GlobalDatabase, ServerResponse}
import utils.JsonUtil.sendJson
import play.api.libs.json.Json.toJson
import utils.JsonUtil

import scala.collection.JavaConversions._
import scala.concurrent.ExecutionContext.Implicits.global

/**
  * Created by bvdmitri on 16.02.16.
  */

object SearchAPI extends Controller {

  def index = Action {
    Ok(views.html.search.index())
  }

  def database = Action {
    sendJson(GlobalDatabase.getDatabase())
  }


  def columns = Action {
    sendJson(new ColumnsInfo(GlobalDatabase.getColumns()))
  }

  case class DatabaseTextFilter(columnId: String, value: String, filterType: String, negative: Boolean)
  implicit val databaseTextFilterRead = Json.reads[DatabaseTextFilter]

  case class DatabaseSequenceFilter(columnId: String, query: String, mismatches: Int, insertions: Int, deletions: Int, mutations: Int, depth: Int)
  implicit val databaseSequenceFilterRead = Json.reads[DatabaseSequenceFilter]

  case class FiltersRequest(textFilters: List[DatabaseTextFilter], sequenceFilters: List[DatabaseSequenceFilter])
  implicit val filtersRequestRead = Json.reads[FiltersRequest]

  def search = Action(parse.json) { request =>
    request.body.validate[FiltersRequest].map {
      case FiltersRequest(requestTextFilters, requestSequenceFilters) =>
        val warnings : util.ArrayList[String] = new util.ArrayList[String]()
        val columns = GlobalDatabase.getDatabase().getHeader
        val filters = FiltersParser.parse(requestTextFilters, requestSequenceFilters)
        sendJson(new SearchResult(filters.textFilters, filters.sequenceFilters, filters.warnings))
    }.recoverTotal {
        e => print(e)
        BadRequest(toJson(ServerResponse("Invalid search request")))
    }
  }

  case class SearchWebSocketRequest(action: String, data: JsValue)
  implicit val searchWebSocketRequestReader = Json.reads[SearchWebSocketRequest]

  case class SearchWebSocketResponse(status: String, action: String, data: JsValue)
  implicit val searchWebSocketResponseWriter = Json.writes[SearchWebSocketResponse]

  case class SearchWebSocketData(rows: String, page: Int, maxPages: Int, pageSize: Int, totalItems: Int)
  implicit val searchWebSocketDataWriter = Json.writes[SearchWebSocketData]

  def searchWebSocket = WebSocket.using[JsValue] { request =>
    val (out,channel) = Concurrent.broadcast[JsValue]
    var searchResults : SearchResult = new SearchResult()
    var filters : FiltersParser = null

    val in = Iteratee.foreach[JsValue] {
      websocketMessage  =>
        try {
          val searchRequest = Json.fromJson[SearchWebSocketRequest](websocketMessage).get
          val requestData = searchRequest.data
          searchRequest.action match {
            case "search"  =>
              val filtersRequest = Json.fromJson[FiltersRequest](requestData).get
              filters = FiltersParser.parse(filtersRequest.textFilters, filtersRequest.sequenceFilters)
              searchResults.reinit(filters.textFilters, filters.sequenceFilters, filters.warnings)
              val data = searchResults.getPage(0)
              channel push Json.toJson(Map(
                "status" -> toJson("success"),
                "action" -> toJson("search"),
                "rows" -> Json.toJson(JsonUtil.convert(data)),
                "totalItems" -> toJson(searchResults.getTotalItems.toInt)
              ))
              if (filters.warnings.size() != 0) {
                channel push Json.toJson(Map(
                  "status" -> toJson("warn"),
                  "action" ->  toJson("search"),
                  "warnings" -> toJson(searchResults.warnings.toList)
                ))
              }
            case "get_page" =>
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              val data = searchResults.getPage(page)
              channel push Json.toJson(Map(
                "status" ->  toJson("success"),
                "action" ->  toJson("get_page"),
                "rows" -> Json.toJson(JsonUtil.convert(data)),
                "page" -> toJson(page)
              ))
            case "sort" =>
              val columnId = (requestData \ "columnId").asOpt[Int].getOrElse(1)
              val sortType = (requestData \ "sortType").asOpt[String].getOrElse("asc")
              val page = (requestData \ "page").asOpt[Int].getOrElse(0)
              searchResults.sort(columnId, sortType)
              val data = searchResults.getPage(page)
              channel push Json.toJson(Map(
                "status" ->  toJson("success"),
                "action" ->  toJson("sort"),
                "rows" -> Json.toJson(JsonUtil.convert(data))
              ))
            case "change_size" =>
              val size = (requestData \ "size").asOpt[Int].getOrElse(100)
              val init = (requestData \ "init").asOpt[Boolean].getOrElse(true)
              searchResults.setPageSize(size)
              channel push Json.toJson(Map(
                "status" ->  toJson("success"),
                "action" ->  toJson("change_size"),
                "init" -> toJson(init),
                "rows" -> toJson(if (init) null else JsonUtil.convert(searchResults.getPage(0))),
                "pageSize" -> toJson(searchResults.getPageSize.toInt)
              ))
            case "complex" =>
              val complexId = (requestData \ "complexId").asOpt[String].getOrElse("-1")
              val gene = (requestData \ "gene").asOpt[String].getOrElse("null")
              val index = (requestData \ "index").asOpt[Int].getOrElse(-1)
              if (gene.equals("TRA") || gene.equals("TRB")) {
                val complexes = GlobalDatabase.findComplexes(complexId, gene)
                channel push Json.toJson(Map(
                  "status" -> toJson("success"),
                  "action" -> toJson("complex"),
                  "rows" -> toJson(JsonUtil.convert(complexes)),
                  "complexId" -> toJson(complexId),
                  "gene" -> toJson(gene),
                  "index" -> toJson(index)
                ))
              } else {
                channel push Json.toJson(Map(
                  "status" -> toJson("error"),
                  "action" -> toJson("complex"),
                  "message" -> toJson("Invalid request")
                ))
              }
            case _ =>
          }
        } catch {
          case e : Exception =>
            e.printStackTrace()
            channel push Json.toJson(Map(
              "status" ->  toJson("error"),
              "message" ->  toJson("Invalid request")
            ))
        }

    }
    (in,out)
  }

}
