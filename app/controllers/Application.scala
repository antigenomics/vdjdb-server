package controllers

import controllers.SearchAPI.CONTENT_TYPE
import play.api.libs.iteratee.Enumerator
import play.api.mvc._
import server.Configuration

import scala.concurrent.ExecutionContext.Implicits.global

object Application extends Controller {

  def index = Action {
    Ok(views.html.index())
  }

  def summary = Action {
    val file = new java.io.File(Configuration.databasePath + "vdjdb_summary_embed.html")
    val fileContent: Enumerator[Array[Byte]] = Enumerator.fromFile(file)

    SimpleResult(
      header = ResponseHeader(200, Map(CONTENT_TYPE -> "text/html")),
      body = fileContent
    )
  }

  def about = Action {
    Ok(views.html.common.about())
  }

}