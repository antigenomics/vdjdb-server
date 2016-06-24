package server.websocket

import play.api.libs.json.{JsValue, Json, Writes}
import server.wrappers.database.{ColumnWrapper, RowWrapper}

/**
  * Created by bvdmitri on 23.06.16.
  */

case class SearchSuccessMessage(rows: List[RowWrapper], totalItems: Int, status: String = "success", action: String = "search")

case class ColumnsSuccessMessage(columns: List[ColumnWrapper], status: String = "success", action: String = "columns")

case class WarningsMessage(warnings: List[String], status: String = "warn", action: String = "search")

case class GetPageSuccessMessage(rows: List[RowWrapper], page: Int, status: String = "success", action: String = "get_page")

case class SortSuccessMessage(rows: List[RowWrapper], status: String = "success", action: String = "sort")

case class ChangeSizeSuccessMessage(init: Boolean, rows: List[RowWrapper], pageSize: Int,
                                   status: String = "success", action: String = "change_size")

case class FindComplexSuccessMessage(complex: RowWrapper, complexId: String, gene: String, index: Int,
                                     status: String = "success", action: String = "complex")

case class ConverterSuccessMessage(exportType: String, link: String, status: String = "success", action: String = "export")

case class ErrorMessage(action: String, message: String, status: String = "error")


object WebSocketSearchMessages {
  implicit val errorMessageWrites = Json.writes[ErrorMessage]
  implicit val columnsSuccessMessageWrites = Json.writes[ColumnsSuccessMessage]
  implicit val searchSuccessMessageWrites = Json.writes[SearchSuccessMessage]
  implicit val warningsMessageWrites = Json.writes[WarningsMessage]
  implicit val getPageSuccessMessageWrites = Json.writes[GetPageSuccessMessage]
  implicit val sortSuccessMessageWrites = Json.writes[SortSuccessMessage]
  implicit val changeSizeSuccessMessageWrites = Json.writes[ChangeSizeSuccessMessage]
  implicit val findComplexSuccessMessageWrites = Json.writes[FindComplexSuccessMessage]
  implicit val converterSuccessMessageWrites = Json.writes[ConverterSuccessMessage]
}