package server.websocket

import play.api.libs.json.{JsObject, Json, Writes}

/**
  * Created by bvdmitri on 26.06.16.
  */
class WarningMessage(val action: String)

object WarningMessage {
  def writesSubclass[T](writer: Writes[T]): Writes[T] = new Writes[T] {
    def writes(t: T) = Json.obj(
      "status" -> "warn",
      "action" -> t.asInstanceOf[WarningMessage].action
    ) ++ writer.writes(t).as[JsObject]
  }
}