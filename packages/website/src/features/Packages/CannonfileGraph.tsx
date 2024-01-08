import { ChainDefinition } from '@usecannon/builder';
import { FC, useEffect, useRef } from 'react';
import React from 'react';
import * as d3 from 'd3';
import { createGlobalStyle } from 'styled-components';
import { Box } from '@chakra-ui/react';


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
`;

export const CannonfileGraph: FC<{
  deploymentInfo: any;
}> = ({ deploymentInfo }) => {
  const nodes: d3.SimulationNodeDatum[] = [];
  const links: d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] = [];

  const chainDefinition = new ChainDefinition(deploymentInfo.def);

  for (const node of chainDefinition.allActionNames) {
    nodes.push({ id: node });
  }
  for (const node of chainDefinition.allActionNames) {
    chainDefinition.resolvedDependencies.get(node)?.forEach((dependency) => {
      links.push({ source: dependency, target: node });
    });
  }

  const svgRef = useRef();

  useEffect(() => {
    // Set up the simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3.forceLink(links).id((d) => d.id)
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(400, 200));

    // Select the SVG element and clear it
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Draw lines for the links
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25) // Adjust this depending on your node size
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'arrowHead');

    // Append lines for links and use the arrow marker
    const link = svg
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')

    const arrowLines = svg.selectAll(".arrow-line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "arrow-line")
      .style("stroke", "none")
      .attr("marker-end", "url(#arrow)"); // Attach the arrowhead marker

    // Append rect elements for each node
    const node = svg
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Append text to the node group
    node
      .append('text')
      .text((d) => `[${d.id}]`)
      .attr('class', 'node-text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle');

    // Update positions on each tick
    simulation.on('tick', () => {
      // Update link positions
      link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      // Update the overlay lines for the arrowheads
      arrowLines.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.source.x + (d.target.x - d.source.x) * 0.5) // Midpoint x
        .attr("y2", d => d.source.y + (d.target.y - d.source.y) * 0.5); // Midpoint y

      // Update node and text positions
      node.attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    });
  }, [nodes, links]);

  return (
    <>
      <GlobalStyles />
      <Box
        border="1px solid"
        borderColor="gray.800"
        height="420px"
        borderRadius="sm"
      >
        <svg ref={svgRef} width={'100%'} height={'100%'} />
      </Box>
    </>
  );
};
