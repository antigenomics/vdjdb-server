package server.wrappers.models

import models.auth.User
import play.api.libs.json.Json
import scala.collection.JavaConversions._

import scala.collection.mutable.ListBuffer

/**
  * Created by bvdmitri on 23.06.16.
  */
case class UserWrapper(email: String, maxFileSize: Int, maxFilesCount: Int, files: List[IntersectionFileWrapper])

object UserWrapper {
  implicit val userWrapperWrites = Json.writes[UserWrapper]

  def wrap(u: User) : UserWrapper = {
    val buffer = ListBuffer[IntersectionFileWrapper]()
    u.getFiles.toList.foreach { file =>
      buffer += new IntersectionFileWrapper(file)
    }
    new UserWrapper(u.getEmail, u.getMaxFileSize, u.getMaxFilesCount, buffer.toList)
  }
}
