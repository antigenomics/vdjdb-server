package controllers

import play.api.Play
import play.api.libs.concurrent.Akka
import play.api.libs.iteratee.Enumerator
import play.api.libs.json.Json._
import play.api.mvc.{ActionBuilder, Request, ResponseHeader, SimpleResult}
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

  def allow(ipAddress: String): Boolean = {
    ipMap.get(ipAddress) match {
      case None => ipMap(ipAddress) = 0
      case Some(v) => ipMap(ipAddress) = v + 1
    }
    ipMap(ipAddress) < maxRequestsPerHour
  }

  def invokeBlock[A](request: Request[A], block: (Request[A]) => Future[SimpleResult]) = {
    if (allow(request.remoteAddress))
      block(request)
    else
      Future(
        SimpleResult(
          header = ResponseHeader(400),
          body = Enumerator("Too many requests".getBytes)
        ))
  }
}
