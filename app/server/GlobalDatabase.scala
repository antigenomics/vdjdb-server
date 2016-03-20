package server

import java.util

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Database
import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.TextFilter
import com.antigenomics.vdjtools.sample.Sample
import utils.SynchronizedAccess

/**
  * Created by bvdmitri on 16.03.16.
  */
object GlobalDatabase extends SynchronizedAccess {
  private var db : Synchronized[VdjdbInstance] = Synchronized(new VdjdbInstance())

  def search(textFilters : util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter]) =
    synchronizeRead { implicit lock =>
      db().getDbInstance.search(textFilters, sequenceFilters)
    }

  def intersect(sample: Sample) =
    synchronizeRead { implicit lock =>
      val clonotypeDatabase = VdjdbInstance.asClonotypeDatabase(db().getDbInstance)
      clonotypeDatabase.search(sample)
    }

  def getDatabase() =
    synchronizeRead { implicit lock =>
      db().getDbInstance
    }

  def getColumns() =
    synchronizeRead { implicit lock =>
      db().getDbInstance.getColumns
    }

  def update() =
    synchronizeReadWrite { implicit lock =>
      if (checkDatabase(true)) {
        db = Synchronized(new VdjdbInstance())
      }
    }
}
