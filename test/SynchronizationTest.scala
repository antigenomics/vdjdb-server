import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.test._
import play.api.test.Helpers._
import server.database.SynchronizedAccess


/**
  * Created by bvdmitri on 18.03.16.
  */

@RunWith(classOf[JUnitRunner])
class SynchronizationTest extends Specification {

  class IntSynchronized extends SynchronizedAccess {
    var int : Synchronized[Int] = Synchronized(0)

    def print() =
      synchronizeRead { implicit lock =>
        println(int)
      }
  }

  "Application" should {
    "lock" in {
      val int = new IntSynchronized()

      val thread1 = new Thread(new Runnable {
        override def run(): Unit = {
          int.print()
        }
      })

      thread1.run()
    }
  }
}
