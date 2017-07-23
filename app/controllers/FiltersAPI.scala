package controllers

// import com.antigenomics.vdjdb.scoring.{ScoringMetadata, ScoringMetadataTable}
import play.api.libs.iteratee.{Concurrent, Iteratee}
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.{Controller, WebSocket}
import play.api.libs.json.Json.toJson
import server.database.GlobalDatabase
import server.websocket.ErrorMessage
import server.websocket.filters._
import server.websocket.filters.WebSocketFiltersMessages._

import scala.concurrent.ExecutionContext.Implicits.global

/**
  * Created by bvdmitri on 17.07.16.
  */

object FiltersAPI extends Controller {

  case class FiltersWebSocketRequest(action: String, data: JsValue)
  implicit val filtersSocketRequestReader = Json.reads[FiltersWebSocketRequest]

  def filtersWebSocket = WebSocket.using[JsValue] { request =>
    val (out,channel) = Concurrent.broadcast[JsValue]

    val in = Iteratee.foreach[JsValue] {
      websocketMessage  =>
        val request = Json.fromJson[FiltersWebSocketRequest](websocketMessage).get
        val data = request.data

        try request.action match {
          case "columns" =>
            channel push toJson(ColumnsSuccessMessage(GlobalDatabase.getColumns))
          case "presets" =>
            channel push toJson(PresetsSuccessMessage(GlobalDatabase.getPresets))
          case "suggestions.epitope" =>
            channel push toJson(EpitopeSuggestionsSuccessMessage(GlobalDatabase.getCachedEpitopeSuggestions))  
          // case "compute_precision" =>
          //   val id = (data \ "id").asOpt[Int].getOrElse(-1)
          //   val value = (data \ "value").asOpt[Float].getOrElse(-1.0f)
          //   val metadata = new ScoringMetadataTable().getByRecall(value)
          //   channel push toJson(ComputePrecisionSuccessMessage(id, metadata.getPrecision))
          // case "compute_recall" =>
          //   val id = (data \ "id").asOpt[Int].getOrElse(-1)
          //   val value = (data \ "value").asOpt[Float].getOrElse(-1.0f)
          //   val metadata = new ScoringMetadataTable().getByPrecision(value)
          //   channel push toJson(ComputeRecallSuccessMessage(id, metadata.getRecall))
          case _ =>

        } catch {
          case e : Exception =>
            channel push toJson(ErrorMessage("Invalid request" ))
        }
    }


    (in,out)
  }

}
