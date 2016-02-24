package controllers

import models.auth.AuthToken
import play.api._
import play.api.mvc._
import utils.CommonUtils

object Application extends Controller {

  def index = Action {
    Ok(views.html.index())
  }

}