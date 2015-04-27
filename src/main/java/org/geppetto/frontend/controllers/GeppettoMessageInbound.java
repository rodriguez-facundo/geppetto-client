/*******************************************************************************
 * The MIT License (MIT)
 * 
 * Copyright (c) 2011 - 2015 OpenWorm.
 * http://openworm.org
 * 
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the MIT License
 * which accompanies this distribution, and is available at
 * http://opensource.org/licenses/MIT
 *
 * Contributors:
 *     	OpenWorm - http://openworm.org/people.html
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights 
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
package org.geppetto.frontend.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.catalina.websocket.MessageInbound;
import org.apache.catalina.websocket.WsOutbound;
import org.geppetto.core.common.GeppettoExecutionException;
import org.geppetto.core.common.GeppettoInitializationException;
import org.geppetto.core.data.DataManagerHelper;
import org.geppetto.core.data.IGeppettoDataManager;
import org.geppetto.core.data.model.IGeppettoProject;
import org.geppetto.core.simulation.ISimulation;
import org.geppetto.frontend.GeppettoTransportMessage;
import org.geppetto.frontend.INBOUND_MESSAGE_TYPES;
import org.geppetto.frontend.OUTBOUND_MESSAGE_TYPES;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.web.context.support.SpringBeanAutowiringSupport;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonParseException;
import com.google.gson.reflect.TypeToken;

/**
 * Class used to process Web Socket Connections. Messages sent from the connecting clients, web socket connections, are received in here.
 * 
 */
public class GeppettoMessageInbound extends MessageInbound
{

	/*
	 * Keeps track of mode visitor is in, either observing or controlling the simulation
	 */
	public enum VisitorRunMode
	{
		OBSERVING, CONTROLLING, WAITING
	}

	@Autowired
	private ISimulation _simulationService;

	private GeppettoServletController _servletController;
	private final String _client_id;

	protected ApplicationContext applicationContext;

	private VisitorRunMode currentMode = VisitorRunMode.OBSERVING;
	private boolean _isSimulationLoaded;

	public GeppettoMessageInbound(String client_id)
	{
		super();
		this._servletController = GeppettoServletController.getInstance();
		this._client_id = client_id;
		SpringBeanAutowiringSupport.processInjectionBasedOnCurrentContext(this);
	}

	@Override
	protected void onOpen(WsOutbound outbound)
	{
		_servletController.addConnection(this);

		_servletController.messageClient(null, this, OUTBOUND_MESSAGE_TYPES.CLIENT_ID, this._client_id);
	}

	@Override
	protected void onClose(int status)
	{
		_servletController.removeConnection(this);
	}

	@Override
	protected void onBinaryMessage(ByteBuffer message) throws IOException
	{
		throw new UnsupportedOperationException("Binary message not supported.");
	}

	/**
	 * Receives message(s) from client.
	 * 
	 * @throws JsonProcessingException
	 */
	@Override
	protected void onTextMessage(CharBuffer message) throws JsonProcessingException
	{
		String msg = message.toString();

		// de-serialize JSON
		GeppettoTransportMessage gmsg = new Gson().fromJson(msg, GeppettoTransportMessage.class);

		String requestID = gmsg.requestID;

		// switch on message type
		// NOTE: each message handler knows how to interpret the GeppettoMessage data field
		switch(INBOUND_MESSAGE_TYPES.valueOf(gmsg.type.toUpperCase()))
		{
			case GEPPETTO_VERSION:
			{
				_servletController.getVersionNumber(requestID, this);
				break;
			}
			case INIT_URL:
			{
				String jsonUrlString = gmsg.data;
				URL url;
				try
				{
					url = new URL(jsonUrlString);
					BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream()));
					IGeppettoProject geppettoProject = DataManagerHelper.getDataManager().getProjectFromJson(getGson(), reader);
					_servletController.load(requestID, getGeppettoModelUrl(geppettoProject), this);
				}
				catch(IOException e)
				{
					_servletController.messageClient(requestID, this, OUTBOUND_MESSAGE_TYPES.ERROR_LOADING_SIMULATION);
				}
				break;
			}
			case INIT_ID:
			{
				String idString = gmsg.data;
				IGeppettoDataManager dataManager = DataManagerHelper.getDataManager();
				try
				{
					IGeppettoProject geppettoProject = dataManager.getGeppettoProjectById(Long.parseLong(idString));
					_servletController.load(requestID, getGeppettoModelUrl(geppettoProject), this);
				}
				catch(NumberFormatException e)
				{
					_servletController.messageClient(requestID, this, OUTBOUND_MESSAGE_TYPES.ERROR_LOADING_SIMULATION);
				}
				break;
			}
			case INIT_SIM:
			{
				String simulation = gmsg.data;
				IGeppettoProject geppettoProject = DataManagerHelper.getDataManager().getProjectFromJson(getGson(), simulation);
				_servletController.load(requestID, getGeppettoModelUrl(geppettoProject), this);
				break;
			}
			case RUN_SCRIPT:
			{
				String urlString = gmsg.data;
				URL url = null;
				try
				{
					url = new URL(urlString);

					_servletController.sendScriptData(requestID, url, this);

				}
				catch(MalformedURLException e)
				{
					_servletController.messageClient(requestID, this, OUTBOUND_MESSAGE_TYPES.ERROR_READING_SCRIPT);
				}
				break;
			}
			case SIM:
			{
				String url = gmsg.data;
				_servletController.getSimulationConfiguration(requestID, url, this);
				break;
			}
			case START:
			{
				_servletController.startSimulation(requestID, this);
				break;
			}
			case PAUSE:
			{
				_servletController.pauseSimulation(requestID, this);
				break;
			}
			case STOP:
			{
				_servletController.stopSimulation(requestID, this);
				break;
			}
			case OBSERVE:
			{
				_servletController.observeSimulation(requestID, this);
				break;
			}
			case SET_WATCH:
			{
				String watchListsString = gmsg.data;

				try
				{
					_servletController.setWatchedVariables(requestID, watchListsString, this);
				}
				catch(GeppettoExecutionException e)
				{
					_servletController.messageClient(requestID, this, OUTBOUND_MESSAGE_TYPES.ERROR_SETTING_WATCHED_VARIABLES);
				}
				catch(GeppettoInitializationException e)
				{
					_servletController.messageClient(requestID, this, OUTBOUND_MESSAGE_TYPES.ERROR_SETTING_WATCHED_VARIABLES);
				}

				break;
			}
			case CLEAR_WATCH:
			{
				_servletController.clearWatchLists(requestID, this);
				break;
			}
			case IDLE_USER:
			{
				_servletController.disableUser(requestID, this);
				break;
			}
			case GET_MODEL_TREE:
			{
				String instancePath = gmsg.data;

				_servletController.getModelTree(requestID, instancePath, this);
				break;
			}
			case GET_SIMULATION_TREE:
			{
				String instancePath = gmsg.data;
				
				_servletController.getSimulationTree(requestID,instancePath,this);
				break;
			}
			case GET_SUPPORTED_OUTPUTS:
			{
				// String instancePath = gmsg.data;
				//
				// _servletController.getModelTree(requestID,instancePath,this);
				break;
			}
			case WRITE_MODEL:
			{

				Map<String, String> parameters = new Gson().fromJson(gmsg.data, new TypeToken<HashMap<String, String>>()
				{
				}.getType());
				_servletController.writeModel(requestID, parameters.get("instancePath"), parameters.get("format"), this);

			}
			case SET_PARAMETERS:
			{
				Map<String, String> parameters = new Gson().fromJson(gmsg.data, new TypeToken<HashMap<String, String>>()
				{
				}.getType());
				
				String modelPath = parameters.get("model");
				//remove model path from parameters map that was sent from server
				parameters.remove(modelPath);
				_servletController.setParameters(requestID,modelPath, parameters, this);
			}
			default:
			{
				// NOTE: no other messages expected for now
			}
		}
	}

	private Gson getGson()
	{
		GsonBuilder builder = new GsonBuilder();
		builder.registerTypeAdapter(Date.class, new JsonDeserializer<Date>()
		{
			@Override
			public Date deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) throws JsonParseException
			{
				return new Date(json.getAsJsonPrimitive().getAsLong());
			}
		});
		return builder.create();
	}

	private String getGeppettoModelUrl(IGeppettoProject project)
	{
		if(project != null)
		{
			// this could be null when loaded from a json that may not include the model part
			if(project.getGeppettoModel() == null)
			{
				project = DataManagerHelper.getDataManager().getGeppettoProjectById(project.getId());
			}
			if(project.getGeppettoModel() != null)
			{
				return project.getGeppettoModel().getUrl();
			}
		}
		return "";
	}

	public String getConnectionID()
	{
		return _client_id;
	}

	public VisitorRunMode getCurrentRunMode()
	{
		return currentMode;
	}

	public void setVisitorRunMode(VisitorRunMode mode)
	{
		currentMode = mode;
	}

	public ISimulation getSimulationService()
	{
		return this._simulationService;
	}

	public boolean isSimulationLoaded()
	{
		return _isSimulationLoaded;
	}

	public void setIsSimulationLoaded(boolean loaded)
	{
		this._isSimulationLoaded = loaded;
	}

}
