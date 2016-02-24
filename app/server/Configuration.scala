package server

import play.api.{Play}

/**
  * Created by bvdmitri on 23.02.16.
  */
object Configuration {
  def uploadPath : String = Play.current.configuration.getString("uploadPath").get
  def maxFilesCount : Int = Play.current.configuration.getInt("maxFilesCount").get
  def maxFilesSize : Int = Play.current.configuration.getInt("maxFilesSize").get
}
