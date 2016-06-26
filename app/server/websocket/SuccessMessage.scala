package server.websocket

import play.api.libs.json.{JsObject, JsValue, Json, Writes}
import server.wrappers.database.{ColumnWrapper, RowWrapper}

/**
  * Created by bvdmitri on 23.06.16.
  */

class SuccessMessage(val action: String)

object SuccessMessage {
  def writesSubclass[T](writer: Writes[T]): Writes[T] = new Writes[T] {
    def writes(t: T) = Json.obj(
      "status" -> "success",
      "action" -> t.asInstanceOf[SuccessMessage].action
    ) ++ writer.writes(t).as[JsObject]
  }
}