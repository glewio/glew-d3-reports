'use strict';

const glew = {

  reportError: function(msg) {
    $("<h1 class='mode-error'>").text(msg).prependTo(document.body);
  },

  getColumnsFromQuery: function(queryName) {
    var columns = datasets.filter(function(d) { if (d) { return d.queryName == queryName;}; })[0];
    if (!columns) {
      alamode.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return columns.columns
  },

  getDataFromQuery: function(queryName) {
    var data = datasets.filter(function(d) { if (d) { return d.queryName == queryName;}; })[0];
    if (!data) {
      alamode.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return data.content;
  },

  stackedBarChart: function(params = {}) {
    const {
      queryName,
      colorArr = ['#2196F3', '#7168F2', '#00B8CC', '#55E0AA', '#FFB300', '#FF525E', '#8EA2AC', 'rgb(255, 152, 150)', 'rgb(148, 103, 189)', 'rgb(197, 176, 213)', 'rgb(140, 86, 75)', 'rgb(196, 156, 148)', 'rgb(227, 119, 194)', 'rgb(250, 175, 250)', 'rgb(255, 238, 0)', 'rgb(252, 163, 45)', 'rgb(15, 22, 219)', 'rgb(15, 219, 196)'],
      yAxisLabel = '',
      margins = { top: 80, right: 30, bottom: 70, left: 80 };
    } = params;

    // Convert date from string to Date Obj
    const parseDate = d3.timeParse('%Y-%m-%d');
    // Convert date from DateObj to String
    const formatDate = d3.timeFormat('%b %e, %Y');

    // const rawData = datasets.find(d => d.queryName === queryName);
    const rawData = glew.getDataFromQuery(queryName);
    const content = rawData.content;

    const totals = content.reduce((acc, cur) => {
      const curChan = cur.channel;
      return Object.keys(acc).includes(curChan) ? { ...acc,
        [curChan]: acc[curChan] += cur.orders
      } : { ...acc,
        [curChan]: cur.orders
      }
    }, {});

    const channelsSorted = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

    const pivotedData = content.reduce((acc, cur) => {
      const {
        the_date,
        channel,
        orders
      } = cur;
      const exist = acc.find(c => c.date === the_date)
      if (exist) {
        exist[channel] = orders;
        return acc;
      } else {
        return [...acc, {
          date: the_date,
          [channel]: orders
        }];
      }
    }, []);

    const dataFinal = pivotedData.map(d => {
      const obj = {
        date: d.date
      }
      const finalObj = channelsSorted.reduce((acc, cur) => {
        return { ...acc,
          [cur]: d[cur] || 0
        }
      }, obj);
      return finalObj
    });

    const dates = content.reduce((acc, cur) => {
      return acc.includes(cur.the_date)
        ? acc
        : [...acc, cur.the_date]
    }, []).map(d => parseDate(d));

    const stacked = d3.stack().keys(channelsSorted)(dataFinal);
    const dailyTotals = stacked[0].map(d => {
      const {
        date,
        ...channels
      } = d.data;
      const totals = Object.keys(channels).reduce((acc, cur) => acc + channels[cur], 0);
      return {
        date,
        totals
      }
    }, {})
    // Set up basic constants
    const yAxisValue = yAxisLabel
    const margin = {
      top: 80,
      right: 30,
      bottom: 70,
      left: 80
    };
    const width = 1080 - margins.right - margins.left;
    const height = 400 - margins.top - margins.bottom;

    const svg = d3.select('#d3-bar').append('svg')
      .attr('id', 'bar-chart')
      .attr("width", width + margins.left + margins.right)
      .attr("height", height + margins.top + margins.bottom)

    const chart = svg.append("g")
      .attr('class', 'chart-area')
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")")

    let legend = svg.append('g')
      .attr('class', 'bar-legend')
      .attr('transform', `translate(${width/2}, 0)`)

    let x = d3.scaleBand().rangeRound([0, width])
    let y = d3.scaleLinear().range([height, 0]);

    let color = d3.scaleOrdinal()
      .domain(channelsSorted)
      .range(colorArr);

    // Axis groups
    let xAxis = chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)


    let yAxis = chart.append('g')
      .attr('class', 'y-axis');

    yAxis.append('text')
      .attr('class', 'axis-title')
      .attr('y', height / 2)
      .attr('x', -35)
      .attr('dy', '1.1em')
      .style('text-anchor', 'end')
      .attr('fill', 'black')
      .text(yAxisValue);



    // // Generate axes onces scales have been set
    // xAxis.call(xAxisCall.scale(x));
    // yAxis.call(yAxisCall.scale(y));


    let tooltip = d3.select("#d3-bar")
      .append("div")
      .attr("class", "tooltip-outter-div")
      .style("visibility", "hidden")

    // gridlines in x axis function
    function make_x_gridlines() {
        return d3.axisBottom(x)
            // .ticks(5)
    }

    // gridlines in y axis function
    function make_y_gridlines() {
        return d3.axisLeft(y)
            .ticks(5)
    }

      chart.append("g")
          .attr("class", "grid")
          .attr("transform", "translate(0," + height + ")")
          .call(make_x_gridlines()
              .tickSize(-height, 0, 0)
              .tickFormat("")
          )

      // add the Y gridlines
      chart.append("g")
          .attr("class", "grid")
          .style("stroke-dasharray", ("3, 3"))
          .call(make_y_gridlines()
              .tickSize(-width, 0, 0)
              .tickFormat("")
          )

    channelsSorted.forEach((c, i) => {
      // Add a row for each item with a space of 20px
      const strLength = c.length;
      let legendRow = legend.append('g')
      let cName = c.replace(/\s+/g, '_')
      if (i < 5) {

        legendRow
            .attr('transform', `translate(${i * 110}, 20)`)

        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            // console.log('AllDisplayed: ', allDisplayed)
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))

            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }
            const allDisplayed = $('.legend-dot').map(function() {
                if ($(this).hasClass('display')) {
                  return $(this).siblings().text()
                }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = { date: d.date };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      } else if (i < 10) {
        legendRow
            .attr('transform', `translate(${(i-5) * 110}, 35)`)
        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))
            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }

            const allDisplayed = $('.legend-dot').map(function() {
                if ($(this).hasClass('display')) {
                  return $(this).siblings().text()
                }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = { date: d.date };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      } else {
        legendRow
            .attr('transform', `translate(${(i-10) * 110}, 50)`)

        // Define the color rectangle
        legendRow.append('circle')
          .attr('r', 5)
          .attr('class', `legend-dot legend-${cName} display`)
          .attr('fill', color(c))
          .on('click', () => {
            const displayed = $(`.legend-${cName}`).hasClass('display');
            if (displayed) {
              $(`.legend-${cName}`).removeClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', 'none')
                .attr('stroke', color(c))
            } else {
              $(`.legend-${cName}`).addClass('display')
              d3.select(`.legend-${cName}`)
                .attr('fill', color(c))
            }
            const allDisplayed = $('.legend-dot').map(function() {
                if ($(this).hasClass('display')) {
                  return $(this).siblings().text()
                }
            }).get();
            const updatedData = dataFinal.map(d => {
              const o = { date: d.date };
              allDisplayed.forEach(c => {
                o[c] = d[c]
              })
              return o
            });
            update(d3.stack().keys(allDisplayed)(updatedData))
          })

        legendRow.append('text')
          .attr('x', 7)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          // .style('text-transform', 'capitalize')
          .text(c)
      }
    });

    let barChart = chart.append('g');

    function update(data) {
      // console.log('Data: ', data)
      const dates = data[0].map(d => parseDate(d.data.date))
      const dailyTotals = data[0].map(d => {
        const {
          date,
          ...channels
        } = d.data;
        const totals = Object.keys(channels).reduce((acc, cur) => acc + channels[cur], 0);
        return {
          date,
          totals
        }
      }, {})

      x.domain(dates)
      y.domain([0, d3.max(dailyTotals, d => d.totals)]).nice()

      let xAxisCall = d3.axisBottom()
            .tickFormat(formatDate)
            .tickValues(x.domain().filter(function(d,i){ return !(i%4)}));

      let yAxisCall = d3.axisLeft()
        .ticks(6)
        .tickFormat(function(d) {
          // console.log('D in tick format: ', d)
          return d;
        });

      // Generate axes onces scales have been set
      xAxis.transition(d3.transition().duration(750)).call(xAxisCall.scale(x));
      yAxis.transition(d3.transition().duration(750)).call(yAxisCall.scale(y));


      let barsSelection = barChart.selectAll('g')
        .data(data, (d, i) => {
          return i
          // return d.key // Interesting transition with this
        })

      let barsJoined = barsSelection
        .join('g')
        .attr('class', d => `${d.key}-layer`)
        .attr('fill', d => color(d.key))

      let bars = barsJoined
        .selectAll("rect")
        .data(d => d)

      bars.exit().remove()

      let drawnBars = bars
        .enter().append("rect")
        .merge(bars)
        .attr("y", () => height)
        .attr("height", 0)

      drawnBars
        .transition()
        .duration(750)
        .attr("x", function(d) {
          return x(parseDate(d.data.date));
        })
        .attr("height", function (d, i) {
          return y(d[0]) - y(d[1]);
        })
        .attr("y", function(d) {
          return y(d[1]);
        })
        .attr("width", width / data[0].length-5)

      drawnBars
        .on("mouseout", function() { tooltip.style("visibility", "hidden"); })
        .on("mouseover", function(d) {
          let yPos = d3.event.pageY - document.getElementById("d3-bar").getBoundingClientRect().y + 10
          const {data} = d
          let [lower, upper] = d;
          const {date,...channels} = data;
          const channelNames = Object.keys(channels);
          const values = channelNames.map(c => channels[c]);
          const runningTotal = channelNames.map((c, i) => ({ [c]: d3.sum(values.slice(0, i+1))}))
          const curChannelObj = runningTotal.find(c => {
            return Object.values(c) > lower && Object.values(c) <= upper
          });
          const curChannel = Object.keys(curChannelObj)[0];
          const total = Object.keys(channels).reduce((acc, cur) => acc + d.data[cur], 0)
          const tipString = Object.keys(channels).reduce((acc, cur) => {
            return `
              ${acc}
              <div class="tip-body-${cur} ${cur === curChannel ? 'tip-body-selected' : ''}">
                <div class="tip-body-channel-color" style="background: ${color(cur)}"></div>
                <div class="tip-body-channel tip-body-channel-${cur}">${cur}</div>
                <div class="tip-body-orders">${channels[cur]} (${((channels[cur] / total) *100).toFixed(1)}%)</div>
              </div>
              `
          }, '');
          let xCord = x(parseDate(date)) + 300; // If it's much less than this, it flickers
          tooltip
            .style("left", xCord + "px")
            // .style("top", yPos + 30 +"px")
            .style('bottom', '250px')
            .style("visibility", "visible")
            .html(function() {
              return `
                  <div class="tip-header">${formatDate(parseDate(date))}</div>
                  <div class="tip-body">${tipString}</div>
                  <div class="tip-totals">
                    <div class="tip-totals-row">
                      <div class="tip-body-channel-color"></div>
                      <div class="tip-body-channel tip-body-channel-total">Total</div>
                      <div class="tip-body-orders">${total}</div>
                    </div>
                  </div>
              `
            });
        })
      // barsSelection.exit.remove();
    }

    update(stacked)
    }

}
