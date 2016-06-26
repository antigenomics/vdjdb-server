package server.websocket

import play.api.libs.json.{Json, Writes}

/**
  * Created by bvdmitri on 26.06.16.
  */

case class ErrorMessage(message: String)

object ErrorMessage {
  implicit val errorMessageWrites = new Writes[ErrorMessage] {
    override def writes(o: ErrorMessage) = Json.obj(
      "status" -> "error",
      "message" -> o.message
    )
  }
}
