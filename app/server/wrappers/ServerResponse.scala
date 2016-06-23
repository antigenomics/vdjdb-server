package server.wrappers

import play.api.libs.json.Json

/**
  * Created by bvdmitri on 24.02.16.
  */


case class ServerResponse(message: String)
object ServerResponse {
  implicit val serverResponseWrites = Json.writes[ServerResponse]
  implicit val serverResponseReads = Json.reads[ServerResponse]
}
