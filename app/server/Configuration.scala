package server

import play.api.{Play}

/**
  * Created by bvdmitri on 23.02.16.
  */
  
object Configuration {
  def uploadPath : String = Play.current.configuration.getString("uploadPath").getOrElse("/tmp")
  def maxFilesCount : Int = Play.current.configuration.getInt("maxFilesCount").getOrElse(0)
  def maxFileSize : Int = Play.current.configuration.getInt("maxFileSize").getOrElse(0)
  def allowGitRequest : Boolean = Play.current.configuration.getBoolean("allowGitRequest").getOrElse(false)
  def deleteAfter : Int = Play.current.configuration.getInt("deleteAfter").getOrElse(0)
  def automaticDatabaseUpdate : Boolean = Play.current.configuration.getBoolean("automaticDatabaseUpdate").getOrElse(true)
  def useLocalDatabase : Boolean = Play.current.configuration.getBoolean("useLocalDatabase").getOrElse(false)
  def databasePath : String = Play.configuration.getString("databasePath").getOrElse("~/database/")

}
