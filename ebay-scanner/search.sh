#!/bin/bash
# Default eBay search wrapper - uses multi-search (best results)

if [ -z "$1" ]; then
  echo "Usage: ./search.sh \"player refractors, autos, numbered\""
  echo ""
  echo "Examples:"
  echo "  ./search.sh \"juan soto refractors, autos, numbered\""
  echo "  ./search.sh \"2003 wade refractors, autos\""
  echo "  ./search.sh \"dirk nowitzki chrome refractors\""
  echo ""
  echo "Note: Uses multi-search by default (best results)"
  exit 1
fi

node multi-search.js "$@"
