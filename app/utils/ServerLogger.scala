package utils

import models.auth.User
import play.api.Logger


/**
 * Created by bvdmitri on 12.02.16.
 */

object ServerLogger {


  def info(message: String) = {
    Logger.info(message)
  }

  def error(message: String) = {
    Logger.error(message)
  }

  def userInfo(user: User, message: String) = {
    info("User: " + user.getEmail + ":" + message)
  }

  def userError(user: User, message: String) = {
    error("User: " + user.getEmail + ":" + message)
  }

}
