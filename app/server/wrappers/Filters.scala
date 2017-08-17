package server.wrappers

import java.util

import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import controllers.SearchAPI
import controllers.SearchAPI.FiltersRequest
import server.database.GlobalDatabase
import com.antigenomics.vdjdb.scoring.DummyAlignmentScoring

import scala.collection.mutable.ListBuffer

/**
  * Created by bvdmitri on 27.05.16.
  */
case class Filters(textFilters: util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter], warnings: List[String]) {
  def this() {
    this(new util.ArrayList[TextFilter](), new util.ArrayList[SequenceFilter](), List())
  }
}

object Filters {

  def parse(filters: FiltersRequest): Filters = {
    parse(filters.textFilters, filters.sequenceFilters)
  }

  def parse(text: List[SearchAPI.DatabaseTextFilter], sequence: List[SearchAPI.DatabaseSequenceFilter]) : Filters = {
    val warnings = ListBuffer[String]()
    val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
    val columns = GlobalDatabase.getColumns

    text.foreach(filter => {
      if (columns.map(column => column.name).indexOf(filter.columnId) >= 0) {
        filter.value match {
          case "" =>
            warnings += (filter.columnId + " ignored: no value specified")
          case _ =>
            filter.filterType match {
              case "exact" => textFilters.add(new ExactTextFilter(filter.columnId, filter.value, filter.negative))
              case "substring_set" => textFilters.add(new SubstringSetTextFilter(filter.columnId, filter.value, filter.negative))
              case "exact_set" => textFilters.add(new ExactSetTextFilter(filter.columnId, filter.value, filter.negative))
              case "pattern" => textFilters.add(new PatternTextFilter(filter.columnId, filter.value, filter.negative))
              case "level" => textFilters.add(new LevelFilter(filter.columnId, filter.value, filter.negative))
              case "minmax" => textFilters.add(new MinMaxFilter(filter.columnId, filter.value.split(":")(0).toInt, filter.value.split(":")(1).toInt))
              case _ =>
                warnings += ("Bad text filter - " + filter + " - incorrect filter type")
            }
        }
      } else {
        warnings += ("Bad text filter - " + filter + " - wrong column")
      }
    })

    val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
    sequence.foreach(filter => {
      filter.columnId match {
        case "cdr3" | "antigen.epitope" =>
          filter.query match {
            case "" =>
              warnings += (filter.columnId + " ignored: no value specified")
            case _ =>
              val preset: SequenceSearcherPreset = new SequenceSearcherPreset(new TreeSearchParameters(filter.substitutions, filter.insertions, filter.deletions, filter.total), DummyAlignmentScoring.INSTANCE)
              sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query.toUpperCase(), preset))
          }
        case _  =>
          warnings += ("Bad sequence filter - " + filter + " - wrong column")
      }
    })
    Filters(textFilters, sequenceFilters, warnings.toList)
  }
}
