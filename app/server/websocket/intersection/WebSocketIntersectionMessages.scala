package server.websocket.intersection

import play.api.libs.json.Json
import server.websocket.{SuccessMessage, WarningMessage}
import server.wrappers.alignment.AlignmentHelperResultWrapper
import server.wrappers.database.{ColumnWrapper, IntersectWrapper}

/**
  * Created by bvdmitri on 26.06.16.
  */

case class IntersectSuccessMessage(fileName: String, totalItems: Int, rows: List[IntersectWrapper]) extends SuccessMessage("intersect")

case class ColumnsSuccessMessage(columns: List[ColumnWrapper]) extends SuccessMessage("columns")

case class GetPageSuccessMessage(fileName: String, page: Int, rows: List[IntersectWrapper]) extends SuccessMessage("get_page")

case class SortSuccessMessage(fileName: String, column: String, sortType: String, rows: List[IntersectWrapper]) extends SuccessMessage("sort")

case class HelperListSuccessMessage(fileName: String, id: Int, helpers: List[AlignmentHelperResultWrapper]) extends SuccessMessage("helper_list")

case class WarningListMessage(warnings: List[String]) extends WarningMessage("search")

object WebSocketIntersectionMessages {
  implicit val intersectSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[IntersectSuccessMessage])
  implicit val columnsSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[ColumnsSuccessMessage])
  implicit val getPageSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[GetPageSuccessMessage])
  implicit val sortSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[SortSuccessMessage])
  implicit val helperListSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[HelperListSuccessMessage])
  implicit val warningListMessageWrites = WarningMessage.writesSubclass(Json.writes[WarningListMessage])
}
