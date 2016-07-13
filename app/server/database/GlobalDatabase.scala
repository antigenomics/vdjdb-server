package server.database

import java.io.FileInputStream
import java.util

import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.{Database, SearchResult}
import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.sample.Sample
import controllers.IntersectionAPI.IntersectParametersRequest
import server.wrappers.database.{ColumnWrapper, IntersectWrapper, PresetWrapper, RowWrapper}
import server.Configuration
import server.wrappers.Filters

import scala.collection.JavaConversions._
import scala.collection.mutable.ListBuffer

/**
  * Created by bvdmitri on 16.03.16.
  */
object GlobalDatabase extends SynchronizedAccess {
  private var db : Synchronized[VdjdbInstance] = null

  def initDatabase(): Unit = {
    if (Configuration.useLocalDatabase) {
      db = Synchronized(new VdjdbInstance(new FileInputStream(Configuration.databasePath + "vdjdb.meta.txt"),
        new FileInputStream(Configuration.databasePath + "vdjdb.txt")))
    } else {
      update()
    }
  }

  def search(filters: Filters) : List[RowWrapper] =
    synchronizeRead { implicit lock =>
      val results = db().getDbInstance.search(filters.textFilters, filters.sequenceFilters)
      val buffer = new ListBuffer[RowWrapper]
      results.toList.foreach(result => {
        buffer += RowWrapper.wrap(result.getRow)
      })
      buffer.toList
    }

  def search() : List[RowWrapper] =
    synchronizeRead { implicit lock =>
      search(new Filters())
    }

  def findComplex(complexId: String, gene: String) : Option[RowWrapper] =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      textFilters.add(new ExactTextFilter("complex.id", complexId, false))
      textFilters.add(new ExactTextFilter("gene", gene, true))
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      val results = search(new Filters(textFilters, sequenceFilters, List()))
      results.headOption
    }

  def intersect(sample: Sample, presetName: String, filters: Filters) : List[IntersectWrapper] =
    synchronizeRead { implicit lock =>
      val buffer = new ListBuffer[IntersectWrapper]()
      val searchResults = db().getDbInstance.search(filters.textFilters, filters.sequenceFilters).asInstanceOf[util.ArrayList[SearchResult]]
      if (searchResults.size() != 0) {
        val preset = SequenceSearcherPreset.byName(presetName)
        preset.withSearchParameters(4, 1, 1, 4)
        val instance = new VdjdbInstance(Database.create(searchResults)).asClonotypeDatabase(false, false, preset)
        var id = 0
        val intersectedResults = instance.search(sample)
        intersectedResults.keySet().toList.foreach(clonotype => {
          buffer += IntersectWrapper.wrap(id, clonotype, intersectedResults.get(clonotype))
          id += 1
        })

      }
      buffer.toList
    }

  def isParametersValid(parameters: IntersectParametersRequest, annotations: Boolean = false): Boolean = {
    val validParameters = if (annotations) Configuration.annotationsBrowseSequenceFilterOptions else Configuration.dbBrowseSequenceFilterOptions
    val maxMutations = validParameters.get(0)
    val maxInsertions = validParameters.get(1)
    val maxDeletions = validParameters.get(2)
    val maxMismatches = validParameters.get(3)

    (parameters.maxDeletions <= maxDeletions && parameters.maxDeletions >= 0) &&
      (parameters.maxInsertions <= maxInsertions && parameters.maxInsertions >= 0) &&
        (parameters.maxMismatches <= maxMismatches && parameters.maxMismatches >= 0) &&
         (parameters.maxMutations <= maxMutations && parameters.maxMutations >= 0)
  }

  def testComplexes() =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      for (i <- 1 to 1000) {
        textFilters.clear()
        textFilters.add(new ExactTextFilter("complex.id", String.valueOf(i), false))
        val result = db().getDbInstance.search(textFilters, sequenceFilters)
        if (result.size() == 1) {
          println("WARN: complexID " + i)
        }
      }
  }

  def getColumns: List[ColumnWrapper] =
    synchronizeRead { implicit lock =>
      var buffer = ListBuffer[ColumnWrapper]()
      db().getDbInstance.getColumns.toList.foreach(column => {
        buffer += ColumnWrapper.wrap(column)
      })
      buffer.toList
    }

  def getPresets(annotations: Boolean = false): List[PresetWrapper] = {
    var buffer = ListBuffer[PresetWrapper]()
    for (presetName <- SequenceSearcherPreset.getALLOWED_PRESETS) {
      val preset = SequenceSearcherPreset.byName(presetName)
      buffer += PresetWrapper.wrap(presetName, preset, annotations)
    }
    buffer.toList
  }

  def update() =
    synchronizeReadWrite { implicit lock =>
      if (checkDatabase(true)) {
        db = Synchronized(new VdjdbInstance())
      }
    }
}
