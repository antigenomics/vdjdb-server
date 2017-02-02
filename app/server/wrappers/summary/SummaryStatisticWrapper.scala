package server.wrappers.summary

import play.api.libs.json.Json
import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import scala.collection.mutable
import scala.collection.JavaConversions._


/**
  * Created by bvdmitri on 22.06.16.
  */

case class ClonotypeCounterWrapper(val unique: Int, val read: Long, val frequency: Double)

object ClonotypeCounterWrapper {
	implicit val ClonotypeCounterWrapperWrites = Json.writes[ClonotypeCounterWrapper]
}

case class SummaryStatisticWrapper(var data: Map[String, Map[String, ClonotypeCounterWrapper]])

object SummaryStatisticWrapper {
  implicit val summaryStatisticWrapperWrites = Json.writes[SummaryStatisticWrapper]

  def wrap(summary: ClonotypeSearchSummary): SummaryStatisticWrapper = {

  	var data: mutable.HashMap[String, Map[String, ClonotypeCounterWrapper]] = mutable.HashMap()

  	if (summary != null) {

  	for ((name, map) <- summary.fieldCounters) {

  		var counters: mutable.HashMap[String, ClonotypeCounterWrapper] = mutable.HashMap()

  		for ((field, value) <- map) {
  			counters += (field -> ClonotypeCounterWrapper(value.getUnique(), value.getReads(), value.getFrequency()))
  		}

  		data += (name -> counters.toMap)
  	}
  	}

    new SummaryStatisticWrapper(data.toMap)
  }
}
