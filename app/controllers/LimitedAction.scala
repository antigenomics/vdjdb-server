package controllers

import play.api.Play
import play.api.libs.concurrent.Akka
import play.api.libs.iteratee.Enumerator
import play.api.libs.json.Json._
import play.api.mvc._
import server.Configuration
import utils.CommonUtils

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.Future

/**
  * Created by bvdmitri on 23.06.16.
  */

object LimitedAction extends ActionBuilder[Request] {
  val maxRequestsPerHour = Configuration.maxRequestsPerHour
  val clearInterval = Configuration.requestsClearInterval
  val ipMap = CommonUtils.createMutableMap[String, Int]

  val LimitErrorMessage = toJson(Map(
    "status" -> toJson("error"),
    "message" -> toJson("Too many requests")
  ))

  Akka.system(Play.current).scheduler.schedule(0 minutes, clearInterval minutes, new Runnable {
    override def run(): Unit = {
      ipMap.clear()
    }
  })

  def allow(request: RequestHeader): Boolean = {
    val ip = request.headers.get("X-Real-IP").getOrElse(request.remoteAddress)
    ipMap.get(ip) match {
      case None => ipMap(ip) = 0
      case Some(v) => ipMap(ip) = v + 1
    }
    ipMap(ip) < maxRequestsPerHour
  }

  def invokeBlock[A](request: Request[A], block: (Request[A]) => Future[SimpleResult]) = {
    if (allow(request))
      block(request)
    else
      Future(
        SimpleResult(
          header = ResponseHeader(400),
          body = Enumerator("Too many requests".getBytes)
        ))
  }
}
