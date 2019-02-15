'use strict';

const glew = {

  reportError: function(msg) {
    $("<h1 class='mode-error'>").text(msg).prependTo(document.body);
  },

  getColumnsFromQuery: function(queryName) {
    var columns = datasets.filter(function(d) { if (d) { return d.queryName == queryName;}; })[0];
    if (!columns) {
      glew.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return columns.columns
  },

  getDataFromQuery: function(queryName) {
    var data = datasets.filter(function(d) { if (d) { return d.queryName == queryName;}; })[0];
    if (!data) {
      glew.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return data.content;
  },

  stackedBarChart: function(params = {}) {
    if(params === 'Define Params') {
      console.log({
        queryName: 'String: The name of the Mode query returning the data you want to use to generate the report',
        dataFormat: 'The query should return 3 columns, the_date, a grouping (ie the "stacks"), and the value to be returned.  For example, the_date, channels, orders',
        yAxisLabel: 'String: The label of the yAxis.  Defaults to empty string',
        margins: 'Object: An object with top, right, bottom, and left keys.  These are the margins of the report within the outter svg',
        xAxisValue: 'String: The column name in the query for the xAxis.Default value is "the_date"',
        yAxisValue: 'String: The column name in the query for the yAxis. Default value is "values"',
        stack: 'String: The column name in the query for the stacks (ie groupings). Default value is "channel"',
        divSelector: 'String: The selector (id or class) of the div that\'s going to contain the chart.  By the way, you need to add a div with an id that will wrap the chart.  Default is "#d3-bar"',
        timeParseFormat: 'String: The format of the time your query returns (https://github.com/d3/d3-time-format). Default is "%Y-%m-%d"',
        timeFomat: 'String: The time format you want to display on your bar graph (https://github.com/d3/d3-time-format).  Default is "%b %e, %Y"',
        outterWidth: 'Int: The "outter" width (in px) of your bar chart (the chart will be this - margins.left - margins.right).  Default is 1080',
        outterHeight: 'Ing: The "outter" height (in px) of your bar chart (the chart will be this - margins.top - margins.bottom).  Default is 600'
      });
      return;
    }
    const {
      queryName,
      colorArr = ['#2196F3', '#7168F2', '#00B8CC', '#55E0AA', '#FFB300', '#FF525E', '#8EA2AC', 'rgb(255, 152, 150)', 'rgb(148, 103, 189)', 'rgb(197, 176, 213)', 'rgb(140, 86, 75)', 'rgb(196, 156, 148)', 'rgb(227, 119, 194)', 'rgb(250, 175, 250)', 'rgb(255, 238, 0)', 'rgb(252, 163, 45)', 'rgb(15, 22, 219)', 'rgb(15, 219, 196)'],
      yAxisLabel = '',
      margins = { top: 80, right: 30, bottom: 70, left: 80 },
      xAxisValue = 'the_date',
      yAxisValue = 'values',
      stack = 'groups',
      divSelector = '#d3-bar',
      timeParseFormat = '%Y-%m-%d',
      timeFomat = '%b %e, %Y',
      outterWidth = 1080,
      outterHeight = 400,
    } = params;

    // Convert date from string to Date Obj
    const parseDate = d3.timeParse(timeParseFormat);
    // Convert date from DateObj to String
    const formatDate = d3.timeFormat(timeFomat);
    // const rawData = datasets.find(d => d.queryName === queryName);
    const rawData = glew.getDataFromQuery(queryName);

    const totals = rawData.reduce((acc, cur) => {
      const curChan = cur[stack];
      return Object.keys(acc).includes(curChan) ? { ...acc,
        [curChan]: acc[curChan] += cur.orders
      } : { ...acc,
        [curChan]: cur.orders
      }
    }, {});

    const groupingSorted = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

    const pivotedData = rawData.reduce((acc, cur) => {
      const exist = acc.find(c => c.date === cur[xAxisValue])
      if (exist) {
        exist[cur[stack]] = cur[yAxisValue];
        return acc;
      } else {
        return [...acc, {
          date: cur[xAxisValue],
          [cur[stack]]: cur[yAxisValue]
        }];
      }
    }, []);

    const dataFinal = pivotedData.map(d => {
      const obj = {
        date: d.date
      }
      const finalObj = groupingSorted.reduce((acc, cur) => {
        return { ...acc,
          [cur]: d[cur] || 0
        }
      }, obj);
      return finalObj
    });
    
    const dates = rawData.reduce((acc, cur) => {
      return acc.includes(cur[xAxisValue])
        ? acc
        : [...acc, cur[xAxisValue]]
    }, []).map(d => parseDate(d));

    const stacked = d3.stack().keys(groupingSorted)(dataFinal);
    const dailyTotals = stacked[0].map(d => {
      const date = d.data.date;
      const totals = Object.keys(stack).reduce((acc, cur) => acc + stack[cur], 0);
      return {
        date,
        totals
      }
    }, {})

    const width = outterWidth - margins.right - margins.left;
    const height = outterHeight - margins.top - margins.bottom;

    const svg = d3.select(divSelector).append('svg')
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
      .domain(groupingSorted)
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

    let tooltip = d3.select(divSelector)
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

    groupingSorted.forEach((c, i) => {
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

