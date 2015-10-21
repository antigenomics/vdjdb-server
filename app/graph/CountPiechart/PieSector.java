package graph.CountPiechart;

/**
 * Created by bvdmitri on 20.10.15.
 */

public class PieSector {
    private int count;
    private int size;

    public PieSector() {}

    public PieSector(int count) {
        this.count = count;
        this.size = 0;
    }

    public PieSector(int count, int size) {
        this.count = count;
        this.size = size;
    }

    public void count() {
        this.size++;
    }

    public int getCount() {
        return count;
    }

    public int getSize() {
        return size;
    }
}
