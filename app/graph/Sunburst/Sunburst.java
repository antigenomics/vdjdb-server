package graph.Sunburst;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 19.10.15.
 */

public class Sunburst {
    private String name;
    private List<Sunburst> children;
    private double size;

    public Sunburst() {}

    public Sunburst(String name) {
        this.name = name;
        this.children = new ArrayList<>();
    }

    public Sunburst(String name, double size) {
        this.name = name;
        this.size = size;
    }

    public void addElement(Sunburst sunburst) {
        children.add(sunburst);
    }

    public void addFreq(double freq) {
        this.size += freq;
    }

    public String getName() {
        return name;
    }

    public List<Sunburst> getChildren() {
        return children;
    }

    public double getSize() {
        return size;
    }
}
