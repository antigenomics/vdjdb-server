package controllers


import java.util

import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import play.api.libs.iteratee.{Concurrent, Iteratee}
import play.api.libs.json.{JsValue, Json, Reads}
import play.api.mvc._
import server.wrappers.{ColumnsInfo, SearchResult}
import server.{FiltersParser, GlobalDatabase, ServerLogger, ServerResponse}
import utils.JsonUtil.sendJson
import play.api.libs.json.Json.toJson
import play.api.mvc.WebSocket.FrameFormatter
import utils.JsonUtil

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

  case class DatabaseSortRule(columnId: Int, sortType: String)
  implicit val databaseSortRuleReader = Json.reads[DatabaseSortRule]

  case class SearchWebSocketRequest(message: String, filtersRequest: FiltersRequest, page: Int, sortRule: DatabaseSortRule)
  implicit val searchWebSocketRequestReader = Json.reads[SearchWebSocketRequest]

  case class SearchWebSocketResponse(status: String, message: String, data: String, page: Int, maxPages: Int, pageSize: Int, totalItems: Int, warnings: List[String])
  implicit val searchWebSocketResponseWriter = Json.writes[SearchWebSocketResponse]

  def searchWebSocket = WebSocket.using[JsValue] { request =>
    //Concurrent.broadcast returns (Enumerator, Concurrent.Channel)
    val (out,channel) = Concurrent.broadcast[JsValue]
    var searchResults : SearchResult = new SearchResult()
    var filters : FiltersParser = null

    //log the message to stdout and send response back to client
    val in = Iteratee.foreach[JsValue] {
      websocketMessage  =>
        try {
          val searchRequest = Json.fromJson[SearchWebSocketRequest](websocketMessage).get
          searchRequest.message match {
            case "search" =>
              filters = FiltersParser.parse(searchRequest.filtersRequest.textFilters, searchRequest.filtersRequest.sequenceFilters)
              searchResults.reinit(filters.textFilters, filters.sequenceFilters, filters.warnings)
              val data = searchResults.getPage(0)
              channel push Json.toJson(SearchWebSocketResponse("ok", "", JsonUtil.convert(data), 0, searchResults.getMaxPages,
                searchResults.getPageSize, searchResults.getTotalItems, List[String]()))
              if (filters.warnings.size() != 0) {
                channel push Json.toJson(SearchWebSocketResponse("warn", "", "{}", 0, 0, 0, 0, filters.getWarnings))
              }
            case "page" =>
              val data = searchResults.getPage(searchRequest.page)
              channel push Json.toJson(SearchWebSocketResponse("ok", "", JsonUtil.convert(data), searchRequest.page,
                searchResults.getMaxPages, searchResults.getPageSize, searchResults.getTotalItems, List[String]()))
            case "sort" =>
              searchResults.sort(searchRequest.sortRule.columnId, searchRequest.sortRule.sortType)
              val data = searchResults.getPage(searchRequest.page)
              channel push Json.toJson(SearchWebSocketResponse("ok", "", JsonUtil.convert(data), searchRequest.page,
                searchResults.getMaxPages, searchResults.getPageSize, searchResults.getTotalItems, List[String]()))
            case "size" =>
              searchResults.setPageSize(searchRequest.page)
              val data = searchResults.getPage(0)
              channel push Json.toJson(SearchWebSocketResponse("ok", "", JsonUtil.convert(data), 0, searchResults.getMaxPages,
                  searchResults.getPageSize, searchResults.getTotalItems, List[String]()))
            case "reinit_size" =>
              searchResults.setPageSize(searchRequest.page)
            case _ =>

          }
        } catch {
          case e : Exception =>
            e.printStackTrace()
            channel push Json.toJson(SearchWebSocketResponse("error", "Invalid request", "{}", 0, 0, 0, 0, List[String]()))
        }

    }
    (in,out)
  }

}
