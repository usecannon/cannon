import { ChainDefinition } from '@usecannon/builder';
import { FC, useEffect, useRef } from 'react';
import React from 'react';
import * as d3 from 'd3';
import { createGlobalStyle } from 'styled-components';
import { useStepModalContext } from '@/providers/stepModalProvider';

// Define global styles
const GlobalStyles = createGlobalStyle`
  .node {
    fill: white;
    font-size: 12px;
    font-family: "Fira Code", "Fira Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;
    cursor: pointer;
    &:hover {
      fill: #1ad6ff;
    }
  }

  .link {
    stroke: #4c5666;
  }
  
  .arrow-line {
    stroke: none; /* Hide the line, only show the arrow */
  }

  .arrowHead {
    fill: #4c5666;
  }

  .node-text {
    
  }

  .node-background {
    fill: #0E1116;
    stroke: #171B21;
    rx: 2px;
    ry: 2px;
  }
`;

interface ExtendedSimulationNodeDatum extends d3.SimulationNodeDatum {
  id: string;
}

export const CannonfileGraph: FC<{
  deploymentInfo: any;
}> = ({ deploymentInfo }) => {
  const nodes: ExtendedSimulationNodeDatum[] = [];
  const links: d3.SimulationLinkDatum<ExtendedSimulationNodeDatum>[] = [];

  const chainDefinition = new ChainDefinition(deploymentInfo.def);

  for (const node of chainDefinition.allActionNames) {
    nodes.push({ id: node });
  }
  for (const node of chainDefinition.allActionNames) {
    chainDefinition.resolvedDependencies.get(node)?.forEach((dependency) => {
      links.push({ source: dependency, target: node });
    });
  }

  const svgRef = useRef<SVGSVGElement>(null);

  const { setActiveModule } = useStepModalContext();

  useEffect(() => {
    // Select the SVG element and clear it
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svg?.node()?.getBoundingClientRect().width;
    const height = svg?.node()?.getBoundingClientRect().height;

    // Set up the simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => (d as ExtendedSimulationNodeDatum).id)
          .strength(0.1)
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force(
        'center',
        d3.forceCenter(width && width / 2, height && height / 2)
      );

    // Create a group element for all graph elements
    const wrapper = svg.append('g');

    // Initialize zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => wrapper.attr('transform', event.transform));
    svg.call(zoom as any);

    // Define the drag behavior
    const drag = d3
      .drag<SVGCircleElement, ExtendedSimulationNodeDatum>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);

    function dragstarted(
      event: d3.D3DragEvent<
        SVGCircleElement,
        ExtendedSimulationNodeDatum,
        unknown
      >,
      d: ExtendedSimulationNodeDatum
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragged(
      event: d3.D3DragEvent<
        SVGCircleElement,
        ExtendedSimulationNodeDatum,
        unknown
      >,
      d: ExtendedSimulationNodeDatum
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<
        SVGCircleElement,
        ExtendedSimulationNodeDatum,
        unknown
      >,
      d: ExtendedSimulationNodeDatum
    ) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Draw lines for the links
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10') // This might need adjustment
      .attr('refX', 5) // Adjust this depending on the new size
      .attr('refY', 0)
      .attr('markerWidth', 8) // Increased size
      .attr('markerHeight', 8) // Increased size
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5') // Path for the arrow shape
      .attr('class', 'arrowHead');

    // Append lines for links and use the arrow marker
    const link = wrapper
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link');

    const arrowLines = wrapper
      .selectAll('.arrow-line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'arrow-line')
      .style('stroke', 'none')
      .attr('marker-end', 'url(#arrow)'); // Attach the arrowhead marker

    // Append rect elements for each node
    const node = wrapper
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Append text to the node group first
    node
      .append('text')
      .text((d) => `[${d.id}]`)
      .attr('class', 'node-text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .on('click', function (event, d) {
        setActiveModule(d.id);
      });

    // Append a rect to each node for the background
    node
      .insert('rect', 'text')
      .attr('class', 'node-background')
      .attr('width', function (d, i, nodes) {
        const bbox = ((nodes[i] as SVGGElement)
          .nextSibling as SVGGraphicsElement)!.getBBox();
        return bbox.width + 10;
      })
      .attr('height', function (d, i, nodes) {
        const bbox = ((nodes[i] as SVGGElement)
          .nextSibling as SVGGraphicsElement)!.getBBox();
        return bbox.height + 10;
      })
      .attr('x', function (d, i, nodes) {
        const bbox = ((nodes[i] as SVGGElement)
          .nextSibling as SVGGraphicsElement)!.getBBox();
        return bbox.x - 5;
      })
      .attr('y', function (d, i, nodes) {
        const bbox = ((nodes[i] as SVGGElement)
          .nextSibling as SVGGraphicsElement)!.getBBox();
        return bbox.y - 5;
      });

    node.call(drag as any);

    // Update positions on each tick
    simulation.on('tick', () => {
      // Update link positions
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      // Update the overlay lines for the arrowheads
      arrowLines
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.source.x + (d.target.x - d.source.x) * 0.5) // Corrected midpoint x
        .attr('y2', (d: any) => d.source.y + (d.target.y - d.source.y) * 0.5); // Corrected midpoint y

      // Update node and text positions
      node.attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    });

    function zoomToFit() {
      const bounds = wrapper?.node()?.getBBox();
      const dx = bounds?.width;
      const dy = bounds?.height;
      const x = bounds!.x + dx! / 2;
      const y = bounds!.y + dy! / 2;

      const scale = Math.min(0.8 / Math.max(dx! / width!, dy! / height!), 4);
      const translate = [width! / 2 - scale * x, height! / 2 - scale * y];

      svg
        .transition()
        .duration(1000)
        .call(
          zoom.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }

    // Call zoomToFit to fit graph after initial rendering
    setTimeout(() => {
      zoomToFit();
    }, 1500);
  }, [deploymentInfo]);

  return (
    <>
      <GlobalStyles />
      <svg ref={svgRef} width={'100%'} height={'100%'} />
    </>
  );
};
