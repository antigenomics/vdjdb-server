package server

import play.api.{Play}

/**
  * Created by bvdmitri on 23.02.16.
  */
  
object Configuration {
  def uploadPath : String = Play.current.configuration.getString("uploadPath").get
  def maxFilesCount : Int = Play.current.configuration.getInt("maxFilesCount").get
  def maxFileSize : Int = Play.current.configuration.getInt("maxFileSize").get
  def allowGitRequest : Boolean = Play.current.configuration.getBoolean("allowGitRequest").get
}
