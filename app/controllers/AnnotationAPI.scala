package controllers

import java.io.File

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import models.ServerFile
import models.auth.User
import play.api.libs.json.Json
import server.wrappers.IntersectResult
import scala.collection.JavaConversions._
import play.api.mvc._
import server.{GlobalDatabase, ServerResponse}
import utils.CommonUtils
import utils.JsonUtil._
import play.api.libs.json.Json.toJson
import java.util.ArrayList

object AnnotationAPI extends Controller with securesocial.core.SecureSocial {

  def index = SecuredAction {
    Ok(views.html.annotations.index())
  }

  def uploadPage = SecuredAction {
    Ok(views.html.annotations.upload())
  }

  def userInformation = SecuredAction(ajaxCall = true) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    sendJson(user)
  }

  case class IntersectRequest(fileName: String)
  implicit val intersectRequestRead = Json.reads[IntersectRequest]

  def intersect = SecuredAction(parse.json) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    request.body.validate[IntersectRequest].map {
      case IntersectRequest(fileName) =>
        val file = ServerFile.fyndByNameAndUser(user, fileName)
        if (file == null) {
          BadRequest(toJson(ServerResponse("You have no file named " + fileName)))
        } else {
          try {
            val sampleFileConnection = new SampleFileConnection(file.getFilePath, file.getSoftware)
            val sample = sampleFileConnection.getSample
            val clonotypeDatabase = VdjdbInstance.asClonotypeDatabase(GlobalDatabase.db.getDbInstance)
            val results = clonotypeDatabase.search(sample)
            val convertedResults : ArrayList[IntersectResult] = new ArrayList[IntersectResult]()
            results.keySet().toList.foreach(clonotype => {
              convertedResults.add(new IntersectResult(clonotype, results.get(clonotype)))
            })
            sendJson(convertedResults)
          } catch {
            case e: Exception =>
              if (e.getMessage.contains("Unable to parse"))
                BadRequest(toJson(ServerResponse("Wrong file format, unable to parse, " + file.getSoftware.name() + " format expected")))
              else
                BadRequest(toJson(ServerResponse("Error while intersecting")))
          }
        }
    }.recoverTotal {
        e =>
        BadRequest(toJson(ServerResponse("Invalid intersect request")))
    }
  }

  def upload = SecuredAction(parse.multipartFormData) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    val defFileName = request.body.asFormUrlEncoded.get("fileName").get.head
    val defSoftwareType = request.body.asFormUrlEncoded.get("softwareType").get.head
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
            if (!Software.getAllowedNames.contains(defSoftwareType)) {
              BadRequest(toJson(ServerResponse("Invalid software type")))
            } else {
              val software = Software.byName(defSoftwareType)
              val newFile = new ServerFile(user, fileName, software, uniqueName, fileDirectoryPath, filePath)
              newFile.save()
              Ok(toJson(ServerResponse("Success")))
            }
          }
      }
    }.getOrElse {
      BadRequest(toJson(ServerResponse("Server is currently not available")))
    }
  }

  case class DeleteRequest(fileName: String, action: String)
  implicit val deleteRequestRead = Json.reads[DeleteRequest]

  def delete = SecuredAction(parse.json) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    request.body.validate[DeleteRequest].map {
      case DeleteRequest(fileName, action) =>
        action match {
          case "delete" =>
            val file = ServerFile.fyndByNameAndUser(user, fileName)
            if (file == null) {
              BadRequest(toJson(ServerResponse("You have no file named " + fileName)))
            } else {
              ServerFile.deleteFile(file)
              Ok(toJson(ServerResponse("File " + fileName + " have been deleted")))
            }
          case "deleteAll" =>
            user.getFiles.toList.foreach(file => ServerFile.deleteFile(file))
            Ok(toJson(ServerResponse("All files have been deleted")))
          case _ => BadRequest(toJson(ServerResponse("Unknown delete action")))
        }
    }.getOrElse {
      BadRequest(toJson(ServerResponse("Server is currently not available")))
    }
  }

}
