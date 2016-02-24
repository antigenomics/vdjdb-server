package utils

import scala.util.Random

/**
  * Created by bvdmitri on 23.02.16.
  */
object CommonUtils {
  def randomAlphaNumericString(length: Int) : String = Random.alphanumeric.take(length).mkString
  def randomAlphabetString(alphabet: String)(length: Int) : String = Stream.continually(Random.nextInt(alphabet.length)).map(alphabet).take(length).mkString
  def randomAlphaString(length: Int) : String  = randomAlphabetString("abcdefghijklmnopqrstuvwxyz")(length)
}
