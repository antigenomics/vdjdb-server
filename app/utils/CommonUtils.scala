package utils

import java.io.File
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.nio.file.Files.copy
import java.nio.file.Paths.get

import scala.reflect.io.Path
import scala.util.Random

/**
  * Created by bvdmitri on 23.02.16.
  */
object CommonUtils {
  def randomAlphaNumericString(length: Int) : String = Random.alphanumeric.take(length).mkString
  def randomAlphabetString(alphabet: String)(length: Int) : String = Stream.continually(Random.nextInt(alphabet.length)).map(alphabet).take(length).mkString
  def randomAlphaString(length: Int) : String  = randomAlphabetString("abcdefghijklmnopqrstuvwxyz")(length)
  def getListOfFiles(dir: String) : List[File] = {
    val d = new File(dir)
    if (d.exists && d.isDirectory) {
      d.listFiles.filter(_.isFile).toList
    } else {
      List[File]()
    }
  }

  implicit def toPath (filename: String) = get(filename)

  def copyFile(source : String, dest: String): Unit = {
    copy(source, dest, REPLACE_EXISTING)
  }
  def createDir(dir: String): Unit = {
    val d = new File(dir)
    if (!d.exists) {
      d.mkdirs()
    }
  }
}
