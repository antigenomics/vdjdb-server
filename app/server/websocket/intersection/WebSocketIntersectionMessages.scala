package server.websocket.intersection

import play.api.libs.json.Json
import server.websocket.{SuccessMessage, WarningMessage}
import server.wrappers.database.{ColumnWrapper, IntersectWrapper}

/**
  * Created by bvdmitri on 26.06.16.
  */

case class IntersectSuccessMessage(rows: List[IntersectWrapper]) extends SuccessMessage("intersect")

case class ColumnsSuccessMessage(columns: List[ColumnWrapper]) extends SuccessMessage("columns")

case class WarningListMessage(warnings: List[String]) extends WarningMessage("search")

object WebSocketIntersectionMessages {
  implicit val intersectSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[IntersectSuccessMessage])
  implicit val columnsSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[ColumnsSuccessMessage])
  implicit val warningListMessageWrites = WarningMessage.writesSubclass(Json.writes[WarningListMessage])
}
