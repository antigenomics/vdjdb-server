package server

import play.api.Play

/**
  * Created by bvdmitri on 23.02.16.
  */
  
object Configuration {
  private def conf = Play.current.configuration
  def uploadPath : String = conf.getString("uploadPath").getOrElse("/tmp")
  def maxFilesCount : Int = conf.getInt("maxFilesCount").getOrElse(0)
  def maxFileSize : Int = conf.getInt("maxFileSize").getOrElse(0)
  def deleteAfter : Int = conf.getInt("deleteAfter").getOrElse(0)
  def automaticDatabaseUpdate : Boolean = conf.getBoolean("automaticDatabaseUpdate").getOrElse(true)
  def useLocalDatabase : Boolean = conf.getBoolean("useLocalDatabase").getOrElse(false)
  def databasePath : String = conf.getString("databasePath").getOrElse("database/")
  def createDemoAccount : Boolean = conf.getBoolean("createDemoAccount").getOrElse(false)
  def demoDatasetPath : String = conf.getString("demoDatasetPath").getOrElse("demo-dataset/")
  def maxRequestsPerHour : Int = conf.getInt("maxRequestsPerHour").getOrElse(1000)
  def requestsClearInterval: Int = conf.getInt("requestsClearInterval").getOrElse(60)
}
