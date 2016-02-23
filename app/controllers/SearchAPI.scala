package controllers


import java.util


import com.antigenomics.vdjdb.DatabaseAPI
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import play.api.libs.json.{Json, JsValue, Reads}
import play.api.mvc._
import utils.JsonUtil.sendJson

/**
  * Created by bvdmitri on 16.02.16.
  */

object SearchAPI extends Controller {

  def index = Action {
    Ok(views.html.search.index())
  }

  def database = Action {
    val database = DatabaseAPI.getDatabase
    sendJson(database)
  }

  case class DatabaseTextFilter(columnId: String, value: String, filterType: String, negative: Boolean)
  implicit val databaseTextFilterRead = Json.reads[DatabaseTextFilter]

  case class DatabaseSequenceFilter(columnId: String, query: String, mismatches: Int, insertions: Int, deletions: Int, mutations: Int, depth: Int)
  implicit val databaseSequenceFilterRead = Json.reads[DatabaseSequenceFilter]

  case class SearchRequest(textFilters: List[DatabaseTextFilter], sequenceFilters: List[DatabaseSequenceFilter])
  implicit val searchRequestRead = Json.reads[SearchRequest]

  def search = Action(parse.json) { request =>
    request.body.validate[SearchRequest].map {
      case SearchRequest(requestTextFilters, requestSequenceFilters) => {
        val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
        requestTextFilters.map {
          case DatabaseTextFilter(columnId, value, "exact", negative) => textFilters.add(new ExactTextFilter(columnId, value, negative))
          case DatabaseTextFilter(columnId, value, "pattern", negative) => textFilters.add(new PatternTextFilter(columnId, value, negative))
          case DatabaseTextFilter(columnId, value, "substring", negative) => textFilters.add(new SubstringTextFilter(columnId, value, negative))
          case DatabaseTextFilter(columnId, value, "level", negative) => textFilters.add(new LevelFilter(columnId, value, negative))
          case _ => ;
        }
        val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
        requestSequenceFilters.foreach(filter => {
          val parameters : TreeSearchParameters = new TreeSearchParameters(filter.mismatches, filter.insertions, filter.deletions, filter.mutations);
          sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query, parameters))
        })
        sendJson(DatabaseAPI.getDatabase(textFilters, sequenceFilters))
      }
    }.recoverTotal {
      e => print(e); BadRequest("")
    }
  }

}