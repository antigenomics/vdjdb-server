
import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.libs.json.Json
import server.websocket.ColumnsSuccessMessage
import server.websocket._
import server.websocket.search.{ColumnsSuccessMessage, SearchSuccessMessage, WarningListMessage, WebSocketSearchMessages}
import server.wrappers.database.{ColumnMetadataWrapper, ColumnWrapper, EntryWrapper, RowWrapper}

@RunWith(classOf[JUnitRunner])
class JsonSerializerTest extends Specification {

  implicit val entryWrapperReads = Json.reads[EntryWrapper]
  implicit val rowWrapperReads = Json.reads[RowWrapper]

  implicit val columnMetadataWrapperReads = Json.reads[ColumnMetadataWrapper]
  implicit val columnWrapperReads = Json.reads[ColumnWrapper]


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

    "serialize ColumnsSuccessMessage() to JSON" in {

      val columns: List[ColumnWrapper] = List(
        ColumnWrapper(
          "name",
          ColumnMetadataWrapper("columnType", "1", "1", "type", "title", "comment"),
          autocomplete = false,
          List()))

      val columnSuccessMessage = new ColumnsSuccessMessage(columns)
      val serializedObject = Json.toJson(columnSuccessMessage)

      val status = (serializedObject \ "status").asOpt[String]
      val action = (serializedObject \ "action").asOpt[String]
      val wrapper = (serializedObject \ "columns").as[List[ColumnWrapper]]

      status must beSome[String]
      action must beSome[String]
      status.get mustEqual "success"
      action.get mustEqual "columns"

      wrapper.head.metadata.title mustEqual "title"

    }

    "serialize WarningListMessage() to JSON" in {

      val warningsListMessage = new WarningListMessage(List("warning"))
      val serializedObject = Json.toJson(warningsListMessage)

      val status = (serializedObject \ "status").asOpt[String]
      val action = (serializedObject \ "action").asOpt[String]
      val warnings = (serializedObject \ "warnings").as[List[String]]

      status must beSome[String]
      action must beSome[String]
      status.get mustEqual "success"
      action.get mustEqual "search"

      warnings.head mustEqual "warning"

    }
  }
}
