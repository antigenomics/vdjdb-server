package server.wrappers.suggestions

import com.antigenomics.vdjdb.web.EpitopeSuggestion
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 23.07.17.
  */
case class EpitopeSuggestionWrapper(sequence: String, substitutions: Int, indels: Int, length: Int, count: Int) {
	def this(o: EpitopeSuggestion) {
		this(o.sequence, o.substitutions, o.indels, o.length, o.count)
	}
}

object EpitopeSuggestionWrapper {
  implicit val epitopeSuggestionWrapperWrites = Json.writes[EpitopeSuggestionWrapper]
}
