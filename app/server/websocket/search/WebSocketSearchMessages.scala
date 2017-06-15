package server.websocket.search

import play.api.libs.json.Json
import server.websocket.{SuccessMessage, WarningMessage}
import server.wrappers.database.{ColumnWrapper, PresetWrapper, RowWrapper}

/**
  * Created by bvdmitri on 26.06.16.
  */

case class ConnectionInitMessage(numberOfRecordsInDB: Int) extends SuccessMessage("init")

case class SearchSuccessMessage(rows: List[RowWrapper], totalItems: Int) extends SuccessMessage("search")

case class GetPageSuccessMessage(rows: List[RowWrapper], page: Int) extends SuccessMessage("get_page")

case class SortSuccessMessage(rows: List[RowWrapper]) extends SuccessMessage("sort")

case class ChangeSizeSuccessMessage(init: Boolean, rows: List[RowWrapper], pageSize: Int) extends SuccessMessage("change_size")

case class FindComplexSuccessMessage(complex: RowWrapper, complexId: String, gene: String, index: Int) extends SuccessMessage("complex")

case class ConverterSuccessMessage(exportType: String, link: String) extends SuccessMessage("export")

case class WarningListMessage(warnings: List[String]) extends WarningMessage("search")

object WebSocketSearchMessages {
  implicit val connectionInitMessageWrites = SuccessMessage.writesSubclass(Json.writes[ConnectionInitMessage])
  implicit val searchSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[SearchSuccessMessage])
  implicit val getPageSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[GetPageSuccessMessage])
  implicit val sortSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[SortSuccessMessage])
  implicit val changeSizeSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[ChangeSizeSuccessMessage])
  implicit val findComplexSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[FindComplexSuccessMessage])
  implicit val converterSuccessMessageWrites = SuccessMessage.writesSubclass(Json.writes[ConverterSuccessMessage])
  implicit val warningListMessageWrites = WarningMessage.writesSubclass(Json.writes[WarningListMessage])
}
