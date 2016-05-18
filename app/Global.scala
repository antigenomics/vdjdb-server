
import play.api._
import play.api.mvc._
import play.api.mvc.Results._
import play.api.libs.concurrent.Akka
import server.{GlobalDatabase, ServerLogger}

import scala.concurrent.duration._
import play.api.libs.concurrent.Execution.Implicits._

import scala.concurrent.Future

/**
  * Created by bvdmitri on 20.03.16.
  */

object Global extends GlobalSettings {
  override def onStart(app: Application) : Unit = {
    ServerLogger.info("Application has started : trying to update the database")
    GlobalDatabase.initDatabase()
    if (server.Configuration.automaticDatabaseUpdate) {
      updateDaemon(app)
    }
  }

  override def onStop(app: Application) : Unit = {
    ServerLogger.info("Application has stopped")
  }


  override def onHandlerNotFound(request: RequestHeader) : Future[SimpleResult] = {
    Future(NotFound(views.html.common.notFound()))
  }

  def updateDaemon(app: Application) : Unit = {
    Akka.system(app).scheduler.schedule(30 minutes, 1 day, new Runnable {
      override def run(): Unit = {
        ServerLogger.info("Trying to update the database")
        GlobalDatabase.update()
      }
    })
  }

}
