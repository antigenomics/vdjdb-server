package controllers

import java.io.File

import scala.concurrent.duration._
import play.api.libs.concurrent.Execution.Implicits._
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import models.auth.User
import play.api.libs.json.{JsValue, Json}
import server.wrappers.ServerResponse
import play.api.libs.iteratee.{Concurrent, Enumerator, Iteratee}
import scala.collection.JavaConversions._
import play.api.mvc._
import server.Configuration
import server.wrappers.Filters
import utils.CommonUtils
import play.api.libs.json.Json.toJson
import controllers.SearchAPI.FiltersRequest
import models.file.{FileFinder, IntersectionFile, ServerFile}
import play.api.libs.concurrent.Akka
import play.api.libs.iteratee.{Concurrent, Iteratee}
import securesocial.core.{SecureSocial, UserService}
import server.database.GlobalDatabase
import server.results.IntersectResults
import server.websocket.ErrorMessage
import server.websocket.intersection._
import server.websocket.intersection.WebSocketIntersectionMessages._
import server.wrappers.models.UserWrapper
import utils.annotate_converter.AnnotateDocumentConverter

object IntersectionAPI extends Controller with securesocial.core.SecureSocial {

  def getUser(req: RequestHeader): Option[User] = {
    val authenticator = SecureSocial.authenticatorFromRequest(req)
    if (authenticator.isEmpty) {
      None
    } else {
      val auth = UserService.find(authenticator.get.identityId)
      Some(User.findByUUID(auth.get.identityId.userId))
    }
  }

  def index = SecuredAction {
    Ok(views.html.intersection.index())
  }

  def uploadPage = SecuredAction {
    Ok(views.html.intersection.upload())
  }

  def userInformation = SecuredAction(ajaxCall = true) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    Ok(toJson(UserWrapper.wrap(user)))
  }

  def downloadDocument(exportType: String, link: String) = LimitedAction { implicit request =>
    val folder = new java.io.File("/tmp/" + link + "/")
    val extension = AnnotateDocumentConverter.getExtension(exportType)
    val doc = new java.io.File(folder.getAbsolutePath + "/" + "IntersectResults" + extension)
    if (folder.exists() && doc.exists()) {
      val docContent: Enumerator[Array[Byte]] = Enumerator.fromFile(doc)
      doc.delete()
      folder.delete()
      SimpleResult(
        header = ResponseHeader(200, Map(
          CONTENT_DISPOSITION -> ("attachment; filename=IntersectResults" + extension),
          CONTENT_TYPE -> "application/x-download"
        )),
        body = docContent
      )
    } else {
      BadRequest(toJson(ServerResponse("Invalid request")))
    }
  }

  case class IntersectWebSocketRequest(action: String, data: JsValue)

  case class IntersectRequest(fileName: String, filters: FiltersRequest, parameters: IntersectParametersRequest)

  case class IntersectParametersRequest(hammingDistance: Int, matchV: Boolean, matchJ: Boolean)

  implicit val intersectWebSocketRequestReads = Json.reads[IntersectWebSocketRequest]
  implicit val intersectParametersRequestRead = Json.reads[IntersectParametersRequest]
  implicit val intersectRequestRead = Json.reads[IntersectRequest]

  def intersectWebSocket = WebSocket.using[JsValue] { request =>
    val (out, channel) = Concurrent.broadcast[JsValue]
    val user = getUser(request)
    val intersectResults = new IntersectResults()

    if (user.isEmpty) {
      channel push toJson(ErrorMessage("Access denied"))
      channel.eofAndEnd()
    }

    val in = Iteratee.foreach[JsValue] {
      websocketMessage =>
        if (!LimitedAction.allow(request)) {
          channel push LimitedAction.LimitErrorMessage
        } else try {
          val websocketRequest = Json.fromJson[IntersectWebSocketRequest](websocketMessage).get
          val dataRequest = websocketRequest.data
          websocketRequest.action match {
            case "intersect" =>
              val intersectRequest = Json.fromJson[IntersectRequest](dataRequest).get
              val filters = Filters.parse(intersectRequest.filters)
              val file = Some(new FileFinder(classOf[IntersectionFile]).findByNameAndUser(user.get, intersectRequest.fileName))
              file match {
                case Some(f) =>
                  try {
                    val sampleFileConnection = new SampleFileConnection(f.getFilePath, f.getSoftware)
                    val sample = sampleFileConnection.getSample
                    val fileName = intersectRequest.fileName
                    intersectResults.reinit(fileName, sample, filters, intersectRequest.parameters)
                    intersectResults.defaultSort(fileName)
                    channel push toJson(IntersectSuccessMessage(fileName, intersectResults.getTotalItems(fileName), intersectResults.getPage(fileName, 0), intersectResults.getSummaryStatistic(fileName)))
                    if (filters.warnings.nonEmpty) {
                      channel push toJson(WarningListMessage(filters.warnings))
                    }
                  } catch {
                    case e: Exception =>
                      if (e.getMessage.contains("Unable to parse")) {
                        channel push toJson(IntersectionErrorMessage(intersectRequest.fileName, "Wrong file format, unable to parse, " + f.getSoftware.name() + " format expected"))
                      } else {
                        channel push toJson(IntersectionErrorMessage(intersectRequest.fileName, "Error while intersecting"))
                      }
                  }
                case _ =>
                  channel push toJson(ErrorMessage("You have no file named " + intersectRequest.fileName))
              }

            case "get_page" =>
              val page = (dataRequest \ "page").asOpt[Int].getOrElse(0)
              val fileName = (dataRequest \ "fileName").asOpt[String].getOrElse("<invalidName>")
              channel push toJson(GetPageSuccessMessage(fileName, page, intersectResults.getPage(fileName, page)))
            case "sort" =>
              val fileName = (dataRequest \ "fileName").asOpt[String].getOrElse("<invalidName>")
              val column = (dataRequest \ "column").asOpt[String].getOrElse("cdr3aa")
              val sortType = (dataRequest \ "sortType").asOpt[String].getOrElse("asc")
              intersectResults.sort(fileName, column, sortType)
              channel push toJson(SortSuccessMessage(fileName, column, sortType, intersectResults.getPage(fileName, 0)))
            case "helper_list" =>
              val fileName = (dataRequest \ "fileName").asOpt[String].getOrElse("<invalidName>")
              val id = (dataRequest \ "id").asOpt[Int].getOrElse(-1)
              channel push toJson(HelperListSuccessMessage(fileName, id, intersectResults.getHelperList(fileName, id)))
            case "export" =>
              val fileName = (dataRequest \ "fileName").asOpt[String].getOrElse("<invalidName>")
              val exportType = (dataRequest \ "exportType").asOpt[String].getOrElse("excel")
              val converter = AnnotateDocumentConverter.get(exportType)
              converter match {
                case Some(c) =>
                  val link = c.convert(fileName, intersectResults)
                  link match {
                    case Some(l) =>
                      channel push toJson(ConverterSuccessMessage(fileName, exportType, l))
                    case _ =>
                      channel push toJson(ErrorMessage("Export failed"))
                  }
                case None =>
                  channel push toJson(ErrorMessage("Export invalid type"))
              }
            case _ =>
          }
        } catch {
          case e: Exception =>
            e.printStackTrace()
            channel push toJson(ErrorMessage("Invalid request"))
        }
    }

    (in, out)
  }

  def intersect = SecuredAction(parse.json) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    request.body.validate[IntersectRequest].map {
      case IntersectRequest(fileName, filtersRequest, parameters) =>
        val file = new FileFinder(classOf[IntersectionFile]).findByNameAndUser(user, fileName)
        if (file == null) {
          BadRequest(toJson(ServerResponse("You have no file named " + fileName)))
        } else {
          try {
            val filters = Filters.parse(filtersRequest)
            val sampleFileConnection = new SampleFileConnection(file.getFilePath, file.getSoftware)
            val sample = sampleFileConnection.getSample
            Ok(toJson(GlobalDatabase.intersect(sample, filters, parameters)))
          } catch {
            case e: Exception =>
              if (e.getMessage.contains("Unable to parse"))
                BadRequest(toJson(ServerResponse("Wrong file format, unable to parse, " + file.getSoftware.name() + " format expected")))
              else
                print(e)
              BadRequest(toJson(ServerResponse("Error while intersecting")))
          }
        }
    }.recoverTotal {
      e =>
        print(e)
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
        case _ if user.isDemoUser =>
          BadRequest(toJson(ServerResponse("Uploading is not allowed in demo mode")))
        case _ if user.isMaxFilesCountExceeded =>
          BadRequest(toJson(ServerResponse("Exceeded the limit of the number of files")))
        case _ if user.isMaxFileSizeExceeded(file.ref.file.length() / 1024) =>
          BadRequest(toJson(ServerResponse("File is too large")))
        case _ if !fileName.matches("^[a-zA-Z0-9_.+-]{1,40}$") =>
          BadRequest(toJson(ServerResponse("Invalid name")))
        case _ if !user.isIntersectionFileNameUnique(fileName) =>
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
              val newFile = new IntersectionFile(user, fileName, uniqueName, fileDirectoryPath, filePath, software)
              newFile.save()
              if (Configuration.deleteAfter > 0) {
                Akka.system(play.api.Play.current).scheduler.scheduleOnce(Configuration.deleteAfter hours, new Runnable {
                  override def run(): Unit = {
                    val file = new FileFinder(classOf[IntersectionFile]).findByUniqueNameAndUser(user, uniqueName)
                    if (file != null) {
                      ServerFile.deleteFile(file)
                    }
                  }
                })
              }
              Ok(toJson(ServerResponse("Success")))
            }
          }
      }
    }.getOrElse {
      BadRequest(toJson(ServerResponse("Invalid upload request")))
    }
  }

  case class DeleteRequest(fileName: String, action: String)

  implicit val deleteRequestRead = Json.reads[DeleteRequest]

  def delete = SecuredAction(parse.json) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    if (user.isDemoUser) {
      BadRequest(toJson(ServerResponse("Deleting is not allowed in demo mode")))
    } else {
      request.body.validate[DeleteRequest].map {
        case DeleteRequest(fileName, action) =>
          action match {
            case "delete" =>
              val file = new FileFinder(classOf[IntersectionFile]).findByNameAndUser(user, fileName)
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
        BadRequest(toJson(ServerResponse("Invalid delete request")))
      }
    }
  }

}
