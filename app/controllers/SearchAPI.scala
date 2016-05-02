package controllers


import java.util

import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import play.api.libs.json.{JsValue, Json, Reads}
import play.api.mvc._
import server.wrappers.{ColumnsInfo, SearchResult}
import server.{GlobalDatabase, ServerLogger, ServerResponse}
import utils.JsonUtil.sendJson
import play.api.libs.json.Json.toJson

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

  case class SearchRequest(textFilters: List[DatabaseTextFilter], sequenceFilters: List[DatabaseSequenceFilter])
  implicit val searchRequestRead = Json.reads[SearchRequest]

  def search = Action(parse.json) { request =>
    request.body.validate[SearchRequest].map {
      case SearchRequest(requestTextFilters, requestSequenceFilters) =>
        val warnings : util.ArrayList[String] = new util.ArrayList[String]()
        val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
        val columns = GlobalDatabase.getDatabase().getHeader
        requestTextFilters.foreach(filter => {
          if (columns.indexOf(filter.columnId) >= 0) {
            filter.value match {
              case "" =>
                warnings.add("Text filter ignored for " +  filter.columnId + ": empty value field")
              case _ =>
                filter.filterType match {
                  case "exact" => textFilters.add(new ExactTextFilter(filter.columnId, filter.value, filter.negative))
                  case "pattern" => textFilters.add(new PatternTextFilter(filter.columnId, filter.value, filter.negative))
                  case "substring" => textFilters.add(new SubstringTextFilter(filter.columnId, filter.value, filter.negative))
                  case "level" => textFilters.add(new LevelFilter(filter.columnId, filter.value, filter.negative))
                  case _ =>
                    warnings.add("Text filter ignored for " + filter.columnId + ": please select filter type")
                }
            }
          } else {
            warnings.add("Text filter ignored : please select column name")
          }
        })
        val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
        requestSequenceFilters.foreach(filter => {
          filter.columnId match {
            case "" =>
              warnings.add("Sequence filter ignored : please select column name")
            case _  =>
              filter.query match {
                case "" =>
                  warnings.add("Sequence filter ignored for " + filter.columnId + ": empty query field")
                case _ =>
                  val parameters : TreeSearchParameters = new TreeSearchParameters(filter.mismatches, filter.insertions, filter.deletions, filter.mutations)
                  sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query, parameters))
              }
          }
        })
        sendJson(new SearchResult(textFilters, sequenceFilters, warnings))
    }.recoverTotal {
        e => print(e)
        BadRequest(toJson(ServerResponse("Invalid search request")))
    }
  }

}
