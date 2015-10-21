package graph.CountPiechart;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Created by bvdmitri on 20.10.15.
 */

public class CountPiechart {
    private List<PieSector> sectors;
    private int dbcount;
    private int sampleCount;

    public CountPiechart(int dbcount, int sampleCount) {
        this.sectors = new ArrayList<>();
        this.dbcount = dbcount;
        this.sampleCount = sampleCount;
    }

    public CountPiechart() {}

    public void addSector(PieSector sector) {
        sectors.add(sector);
    }

    public void addSector(int count) {
        sectors.add(new PieSector(count));
    }

    public void countSector(int count) {
        for (PieSector sector : sectors) {
            if (Objects.equals(sector.getCount(), count)) {
                sector.count();
                break;
            }
        }
    }

    public PieSector findSectorWithCount(int count) {
        for (PieSector sector : sectors) {
            if (Objects.equals(sector.getCount(), count)) return sector;
        }
        return null;
    }

    public List<PieSector> getSectors() {
        return sectors;
    }

    public int getDbcount() {
        return dbcount;
    }

    public int getSampleCount() {
        return sampleCount;
    }
}
