package server.websocket.filters


import play.api.libs.json.Json
import server.websocket.SuccessMessage
import server.wrappers.database.{ColumnWrapper, PresetWrapper}
import server.wrappers.suggestions.EpitopeSuggestionWrapper

/**
  * Created by bvdmitri on 17.07.16.
  */

case class ColumnsSuccessMessage(columns: List[ColumnWrapper]) extends SuccessMessage("columns")

case class PresetsSuccessMessage(presets: List[PresetWrapper]) extends SuccessMessage("presets")

case class EpitopeSuggestionsSuccessMessage(suggestions: Map[String, List[EpitopeSuggestionWrapper]]) extends SuccessMessage("suggestions.epitope")

case class ComputePrecisionSuccessMessage(id: Int, value: Float) extends SuccessMessage("compute_precision")

case class ComputeRecallSuccessMessage(id: Int, value: Float) extends SuccessMessage("compute_recall")

object WebSocketFiltersMessages {
  implicit val columnsSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[ColumnsSuccessMessage])
  implicit val presetsSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[PresetsSuccessMessage])
  implicit val epitopeSuggestionsSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[EpitopeSuggestionsSuccessMessage])
  implicit val computePrecisionSuccessMessage = SuccessMessage.writesSubclass(Json.writes[ComputePrecisionSuccessMessage])
  implicit val computeRecallSuccessMessage = SuccessMessage.writesSubclass(Json.writes[ComputeRecallSuccessMessage])

}