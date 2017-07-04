
import com.antigenomics.vdjtools.misc.Software
import models.auth.User
import models.file.{IntersectionFile, ServerFile}
import org.apache.commons.io.FilenameUtils
import org.mindrot.jbcrypt.BCrypt
import play.api._
import play.api.mvc._
import play.api.mvc.Results._
import play.api.libs.concurrent.Akka
import server.ServerLogger

import scala.concurrent.duration._
import play.api.libs.concurrent.Execution.Implicits._
import securesocial.core._
import server.Configuration
import server.database.GlobalDatabase
import service.AuthService
import utils.CommonUtils

import scala.collection.JavaConversions._
import scala.concurrent.Future

/**
  * Created by bvdmitri on 20.03.16.
  */

object Global extends GlobalSettings {
  override def onStart(app: Application): Unit = {
    ServerLogger.info("Application has started : trying to update the database")
    GlobalDatabase.initDatabase()
    if (Configuration.automaticDatabaseUpdate) {
      updateDaemon(app)
    }

    if (Configuration.createDemoAccount) {
      if (!User.isUserExistByUUID("demo")) {
        val userId = "demo"
        val userService: UserService = new AuthService(app)
        val socialUser = new SocialUser(new IdentityId(userId, "userpass"),
          userId, userId, String.format("%s %s", userId, userId),
          Option.apply(userId), null, AuthenticationMethod.UserPassword,
          null, null, Some.apply(new PasswordInfo("bcrypt", BCrypt.hashpw(userId, BCrypt.gensalt()), null))
        )
        userService.save(socialUser)
      }
      val user = User.findByUUID("demo")
      for (file <- user.getFiles.toList) {
        ServerFile.deleteFile(file)
      }
      for (demoFile <- CommonUtils.getListOfFiles(Configuration.demoDatasetPath)) {

        FilenameUtils.getExtension(demoFile.getName) match {
          case "gz" =>
            val uniqueName = CommonUtils.randomAlphaNumericString(5)
            val destDir = user.getDirectoryPath + "/" + uniqueName
            CommonUtils.createDir(destDir)
            val dest = destDir + "/" + demoFile.getName
            CommonUtils.copyFile(demoFile.getAbsolutePath, dest)
            val intersectionFile: IntersectionFile = new IntersectionFile(user, demoFile.getName,
              uniqueName, destDir, dest, Software.VDJtools)
            intersectionFile.save()
          case _ =>
        }
      }
    }
  }

  override def onStop(app: Application): Unit = {
    ServerLogger.info("Application has stopped")
  }


  override def onHandlerNotFound(request: RequestHeader): Future[SimpleResult] = {
    Future(NotFound(views.html.common.notFound()))
  }

  def updateDaemon(app: Application): Unit = {
    Akka.system(app).scheduler.schedule(30 minutes, 1 day, new Runnable {
      override def run(): Unit = {
        ServerLogger.info("Trying to update the database")
        GlobalDatabase.update()
      }
    })
  }

}
