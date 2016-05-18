package controllers

import java.io.{File, PrintWriter}
import java.util

import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import models.auth.User
import play.api.libs.json.Json
import server.wrappers.IntersectResult

import scala.collection.JavaConversions._
import play.api.mvc._
import server.{Configuration, GlobalDatabase, ServerResponse}
import utils.CommonUtils
import utils.JsonUtil._
import play.api.libs.json.Json.toJson
import java.util.ArrayList

import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.antigenomics.vdjtools.sample.Clonotype
import com.milaboratory.core.tree.TreeSearchParameters
import controllers.SearchAPI.SearchRequest
import models.file.{BranchFile, FileFinder, IntersectionFile, ServerFile}
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.internal.storage.file.FileRepository
import org.eclipse.jgit.lib.Repository
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider

object IntersectionAPI extends Controller with securesocial.core.SecureSocial {

  def index = SecuredAction {
    Ok(views.html.intersection.index())
  }

  def uploadPage = SecuredAction {
    Ok(views.html.intersection.upload())
  }

  def pushDBPage = SecuredAction {
    if (Configuration.allowGitRequest) {
      Ok(views.html.intersection.push())
    } else {
      BadRequest(toJson(ServerResponse("Bad request")))
    }
  }

  def userInformation = SecuredAction(ajaxCall = true) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    sendJson(user)
  }

  case class IntersectRequest(fileName: String, parameters: IntersectParametersRequest, filters: SearchRequest)
  case class IntersectParametersRequest(matchV: Boolean, matchJ: Boolean, maxMismatches: Int, maxInsertions: Int, maxDeletions: Int, maxMutations: Int)

  implicit val intersectParametersRequestRead = Json.reads[IntersectParametersRequest]
  implicit val intersectRequestRead = Json.reads[IntersectRequest]

  def intersect = SecuredAction(parse.json) { implicit request =>
    val user = User.findByUUID(request.user.identityId.userId)
    request.body.validate[IntersectRequest].map {
      case IntersectRequest(fileName, parameters, filters) =>
        println(filters)
        val file = new FileFinder(classOf[IntersectionFile]).findByNameAndUser(user, fileName)
        if (file == null) {
          BadRequest(toJson(ServerResponse("You have no file named " + fileName)))
        } else {
          try {
            val warnings : util.ArrayList[String] = new util.ArrayList[String]()
            val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
            val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
            val columns = GlobalDatabase.getDatabase().getHeader
            filters.textFilters.foreach(filter => {
              if (columns.indexOf(filter.columnId) >= 0) {
                filter.value match {
                  case "" =>
                    warnings.add("Text filter ignored for " +  filter.columnId + ": empty value field")
                  case _ =>
                    filter.filterType match {
                      case "exact" => textFilters.add(new ExactTextFilter(filter.columnId, filter.value, filter.negative))
                      case "pattern" => textFilters.add(new PatternTextFilter(filter.columnId, filter.value, filter.negative))
                      case "substring" => textFilters.add(new SubstringTextFilter(filter.columnId, filter.value, filter.negative))
                      case "level" => textFilters.add(new LevelFilter(filter.columnId, filter.value, filter.negative))
                      case _ =>
                        warnings.add("Text filter ignored for " + filter.columnId + ": please select filter type")
                    }
                }
              } else {
                warnings.add("Text filter ignored : please select column name")
              }
            })
            filters.sequenceFilters.foreach(filter => {
              filter.columnId match {
                case "" =>
                  warnings.add("Sequence filter ignored : please select column name")
                case _  =>
                  filter.query match {
                    case "" =>
                      warnings.add("Sequence filter ignored for " + filter.columnId + ": empty query field")
                    case _ =>
                      val parameters : TreeSearchParameters = new TreeSearchParameters(filter.mismatches, filter.insertions, filter.deletions, filter.mutations)
                      sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query, parameters))
                  }
              }
            })
            val sampleFileConnection = new SampleFileConnection(file.getFilePath, file.getSoftware)
            val sample = sampleFileConnection.getSample
            val results = GlobalDatabase.intersect(sample, parameters, textFilters, sequenceFilters)
            val convertedResults : ArrayList[IntersectResult] = new ArrayList[IntersectResult]()
            if (results != null) {
              results.keySet().toList.foreach(clonotype => {
                convertedResults.add(new IntersectResult(clonotype, results.get(clonotype)))
              })
            }

            sendJson(convertedResults)
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

  def handlePush = SecuredAction(parse.multipartFormData) { implicit request =>
    if (Configuration.allowGitRequest) {
      val user = User.findByUUID(request.user.identityId.userId)
      val defFileName = request.body.asFormUrlEncoded.get("fileName").get.head
      val defBranchName = request.body.asFormUrlEncoded.get("branchName").get.head

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
          case _ if defBranchName.equals("") =>
            BadRequest(toJson(ServerResponse("Invalid branch name")))
          case _ if user.isMaxFilesCountExceeded =>
            BadRequest(toJson(ServerResponse("Exceeded the limit of the number of files")))
          case _ if user.isMaxFileSizeExceeded(file.ref.file.length() / 1024) =>
            BadRequest(toJson(ServerResponse("File is too large")))
          case _ if !fileName.matches("^[a-zA-Z0-9_.+-]{1,40}$") =>
            BadRequest(toJson(ServerResponse("Invalid name")))
          case _ if !user.isBranchNameUnique(defBranchName) =>
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
              val link = GithubAPI.createBranch(user, new File(filePath), defBranchName, defFileName)
              val newFile = new BranchFile(user, fileName, uniqueName, fileDirectoryPath, filePath, defBranchName, link)
              newFile.save()
              Ok(toJson(ServerResponse("Success")))
            }
        }
      }.getOrElse {
        BadRequest(toJson(ServerResponse("Invalid upload request")))
      }
    } else {
      BadRequest(toJson(ServerResponse("Bad request")))
    }
  }

}
