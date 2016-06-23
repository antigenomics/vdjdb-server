package server.websocket

import play.api.libs.json.Json._
import server.wrappers.database.RowWrapper

/**
  * Created by bvdmitri on 23.06.16.
  */
object WebSocketSearchMessages {

  def SearchSuccessMessage(l: List[RowWrapper], t: Int) = toJson(Map(
      "status" -> toJson("success"),
      "action" -> toJson("search"),
      "rows" -> toJson(l),
      "totalItems" -> toJson(t)
    ))

  def WarningsMessage(w: List[String]) = toJson(Map(
      "status" -> toJson("warn"),
      "action" ->  toJson("search"),
      "warnings" -> toJson(w)
    ))

  def GetPageSuccessMessage(l: List[RowWrapper], page: Int) = toJson(Map(
    "status" ->  toJson("success"),
    "action" ->  toJson("get_page"),
    "rows" -> toJson(l),
    "page" -> toJson(page)
  ))

  def SortSuccessMessage(l: List[RowWrapper]) = toJson(Map(
    "status" ->  toJson("success"),
    "action" ->  toJson("sort"),
    "rows" -> toJson(l)
  ))

  def ChangeSizeSuccessMessage(init: Boolean, l: List[RowWrapper], pageSize: Int) = toJson(Map(
    "status" ->  toJson("success"),
    "action" ->  toJson("change_size"),
    "init" -> toJson(init),
    "rows" -> toJson(l),
    "pageSize" -> toJson(pageSize)
  ))

  def FindComplexSuccessMessage(c: RowWrapper, complexId: String, gene: String, index: Int) = toJson(Map(
    "status" -> toJson("success"),
    "action" -> toJson("complex"),
    "complex" -> toJson(c),
    "complexId" -> toJson(complexId),
    "gene" -> toJson(gene),
    "index" -> toJson(index)
  ))

  def FindComplexErrorMessage() = toJson(Map(
    "status" -> toJson("error"),
    "action" -> toJson("complex"),
    "message" -> toJson("Invalid request")
  ))

  def ConverterSuccessMessage(exportType: String, link: String) = toJson(Map(
    "status" -> toJson("success"),
    "action" -> toJson("export"),
    "exportType" -> toJson(exportType),
    "link" -> toJson(link)
  ))

  def ConverterExportFailed() = toJson(Map(
    "status" -> toJson("success"),
    "action" -> toJson("export"),
    "message" -> toJson("Export failed")
  ))

  def ConverterInvalidTypeMessage() = toJson(Map(
    "status" -> toJson("success"),
    "action" -> toJson("export"),
    "message" -> toJson("Invalid export type")
  ))

  def InvalidSearchRequest() = toJson(Map(
    "status" ->  toJson("error"),
    "message" ->  toJson("Invalid request")
  ))


}
