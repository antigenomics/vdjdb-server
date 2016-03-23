package controllers

import models.auth.AuthToken
import play.api._
import play.api.mvc._
import server.GlobalDatabase
import utils.CommonUtils

object Application extends Controller {

  def index = Action {
    Ok(views.html.index())
  }

  def about = Action {
    Ok(views.html.common.about())
  }

}