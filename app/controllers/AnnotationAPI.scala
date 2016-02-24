package controllers

import java.io.File

import models.ServerFile
import models.auth.User
import org.apache.commons.io.FilenameUtils
import play.api.libs.json.Json
import securesocial.core.java.SecureSocial.SecuredAction
import scala.collection.JavaConversions._
import play.api.mvc._
import server.ServerResponse
import utils.CommonUtils
import utils.JsonUtil._
import play.api.libs.json.Json.toJson

object AnnotationAPI extends Controller with securesocial.core.SecureSocial {

  def index = SecuredAction {
    Ok(views.html.annotations.index())
  }

  def uploadPage = SecuredAction {
    Ok(views.html.annotations.upload())
  }

  def userInformation = SecuredAction { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    sendJson(user)
  }

  def upload = SecuredAction(parse.multipartFormData) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    val defFileName = request.body.asFormUrlEncoded.get("fileName").get.head
    request.body.file("file").map { file =>
      val fileName = defFileName match {
        case "" => CommonUtils.randomAlphaString(10)
        case _ => defFileName
      }

      val uploadedFile = file.ref.file
      val uniqueName = CommonUtils.randomAlphaString(10)
      val fileDirectoryPath = user.getDirectoryPath + "/" + uniqueName + "/"
      val fileDirectory = new File(fileDirectoryPath)

      val checks = false
      checks match {
        case _ if user.isMaxFilesCountExceeded =>
          BadRequest(toJson(ServerResponse("Exceeded the limit of the number of files")))
        case _ if user.isMaxFileSizeExceeded(file.ref.file.length() / 1024) =>
          BadRequest(toJson(ServerResponse("File is too large")))
        case _ if !fileName.matches("^[a-zA-Z0-9_.+-]{1,40}$") =>
          BadRequest(toJson(ServerResponse("Invalid name")))
        case _ if !user.isNameUnique(fileName) =>
          BadRequest(toJson(ServerResponse("You should use unique names for your files")))
        case _ if !user.isUserDirectoryExists =>
          user.logError("Error while creating user's directory")
          BadRequest(toJson(ServerResponse("Server is currently not available")))
        case _ if !fileDirectory.exists() && !fileDirectory.mkdir() =>
          user.logError("Error while creating file's directory")
          BadRequest(toJson(ServerResponse("Server is currently not available")))
        case _ =>
          val filePath = fileDirectoryPath + fileName
          val uploaded = uploadedFile.renameTo(new File(filePath))
          if (!uploaded) {
            user.logError("Error while uploading new file")
            BadRequest(toJson(ServerResponse("Server is currently not available")))
          } else {
            val newFile = new ServerFile(user, fileName, uniqueName, fileDirectoryPath, filePath)
            newFile.save()
            Ok(toJson(ServerResponse("Success")))
          }
      }
    }.getOrElse {
      BadRequest(toJson(ServerResponse("Server is currently not available")))
    }
  }

}
