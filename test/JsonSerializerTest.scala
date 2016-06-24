
import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.libs.json.Json
import server.websocket.SearchSuccessMessage
import server.websocket.WebSocketSearchMessages._
import server.wrappers.database.{EntryWrapper, RowWrapper}

@RunWith(classOf[JUnitRunner])
class JsonSerializerTest extends Specification {

  implicit val entryWrapperReads = Json.reads[EntryWrapper]
  implicit val rowWrapperReads = Json.reads[RowWrapper]

  "Application" should {

    "serialize SearchSuccessMessage() to JSON" in {

      val rows: List[RowWrapper] = List(RowWrapper(List(EntryWrapper("columnName", "value"))))
      val searchSuccessMessage = new SearchSuccessMessage(rows, 1)
      val serializedObject = Json.toJson(searchSuccessMessage)

      val status = (serializedObject \ "status").asOpt[String]
      val action = (serializedObject \ "action").asOpt[String]
      val rowsJS = (serializedObject \ "rows").as[List[RowWrapper]]
      val countJS = (serializedObject \ "totalItems").as[Int]

      status must beSome[String]
      action must beSome[String]
      status.get mustEqual "success"
      action.get mustEqual "search"
      rowsJS.head.entries.head.columnName mustEqual "columnName"
      countJS mustEqual 1

    }
  }
}
