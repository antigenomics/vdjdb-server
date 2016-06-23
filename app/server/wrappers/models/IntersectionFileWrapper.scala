package server.wrappers.models

import models.file.ServerFile
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 23.06.16.
  */
case class IntersectionFileWrapper(fileName: String) {
  def this(serverFile: ServerFile) {
    this(serverFile.getFileName)
  }
}

object IntersectionFileWrapper {
  implicit val intersectionFileWrapperWrites = Json.writes[IntersectionFileWrapper]
}
