package utils

import com.fasterxml.jackson.databind
import com.fasterxml.jackson.databind.ObjectMapper
import play.api.http.ContentTypes
import play.api.libs.json.JsValue
import play.api.mvc.SimpleResult
import play.api.mvc.Results.Status

/**
  * Created by bvdmitri on 16.02.16.
  * Helper functions to handle Json values.
  */
object JsonUtil {

  /**
    * Convert an object to JSON String.
    *
    * @param o Value to convert in JSON String.
    */
  def convert(o : AnyRef) = {
    Json.toJson(o).toString
  }

  /**
    * Returns a SimpleResult (as JSON) wrapper.
    *
    * @param o Value to wrap.
    */
  def sendJson(o : AnyRef) : SimpleResult = {
    sendJson(o, 200)
  }

  /**
    * Returns a SimpleResult (as JSON) wrapper.
    *
    * @param o Value to wrap.
    * @param statusCode HTTP Status code
    */
  def sendJson(o : AnyRef, statusCode : Int) : SimpleResult = {
    new Status(statusCode)(convert(o)).as(ContentTypes.JSON)
  }

}
